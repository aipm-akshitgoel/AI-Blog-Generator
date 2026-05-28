import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { TopicOption } from "@/lib/types/strategy";
import { extractRouteError } from "@/lib/formatApiError";
import {
    isAzureContentFilterError,
    isAzureRateLimitError,
    sanitizeStrategyPromptText,
    userFacingContentFilterMessage,
    userFacingRateLimitMessage,
} from "@/lib/azureContentFilter";
import { sectionsFromTopic, topicToTocDraft, tocDraftToTopic } from "@/lib/topicTocDraft";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

export const maxDuration = 120;

function buildTocJson(topic: TopicOption): string {
    const draft = topicToTocDraft(topic);
    const sections = sectionsFromTopic(topic);
    return JSON.stringify(
        {
            title: draft.title,
            primaryKeyword: draft.primaryKeyword,
            secondaryKeywords: draft.secondaryText
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            tertiaryKeywords: draft.tertiaryText
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            sections: sections.map((s) => ({ h2: s.h2, h3s: s.h3s })),
        },
        null,
        2,
    );
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json(
            { error: "Azure OpenAI is not configured", debug: azureConfigDebug() },
            { status: 500 },
        );
    }

    try {
        const body = await req.json();
        const topic = body.topic as TopicOption | undefined;
        const instruction = sanitizeStrategyPromptText(String(body.instruction ?? ""));
        const businessContext = body.businessContext as BusinessContext | undefined;

        if (!topic?.title?.trim()) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }
        if (!instruction.trim()) {
            return NextResponse.json({ error: "Describe how to revise the TOC" }, { status: 400 });
        }

        const client = createAzureClient(azure);
        const systemPrompt = `You are an SEO content strategist helping a writer refine a blog table of contents before drafting.

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "title": "H1 blog title",
  "primaryKeyword": "main SEO phrase for this post",
  "secondaryKeywords": ["phrase one", "phrase two"],
  "tertiaryKeywords": ["phrase one"],
  "sections": [
    { "h2": "Section heading", "h3s": ["Subheading under that H2", "Another H3"] }
  ]
}

Rules:
- Keep the same general topic unless the writer asks to change it.
- Each H3 must sit under the correct H2 in sections[].h3s.
- Use clear, search-friendly headings; no clickbait.
- secondaryKeywords and tertiaryKeywords are arrays of strings (may be empty).`;

        const userLines = [
            "Current TOC:",
            buildTocJson(topic),
            "",
            "Writer revision request:",
            instruction,
        ];
        if (businessContext?.businessName) {
            userLines.push("", `Business: ${businessContext.businessName}`);
        }
        if (businessContext?.targetAudience) {
            userLines.push(`Audience: ${businessContext.targetAudience}`);
        }

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 2048,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userLines.join("\n") },
            ],
        });

        const choice = response.choices?.[0];
        if (choice?.finish_reason === "content_filter") {
            return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
        }

        const text = assistantMessageText(choice?.message?.content);
        if (!text.trim()) {
            return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
        }

        const parsed = JSON.parse(sanitizeJsonString(stripOuterMarkdownFence(text))) as Record<string, unknown>;
        const sectionsRaw = Array.isArray(parsed.sections) ? parsed.sections : [];
        const draft = {
            title: String(parsed.title ?? topic.title).trim(),
            primaryKeyword: String(parsed.primaryKeyword ?? topic.primaryKeyword ?? "").trim(),
            secondaryText: Array.isArray(parsed.secondaryKeywords)
                ? parsed.secondaryKeywords.map((k) => String(k).trim()).filter(Boolean).join("\n")
                : "",
            tertiaryText: Array.isArray(parsed.tertiaryKeywords)
                ? parsed.tertiaryKeywords.map((k) => String(k).trim()).filter(Boolean).join("\n")
                : "",
            sections: sectionsRaw.map((row) => {
                const r = row as Record<string, unknown>;
                const h3s = Array.isArray(r.h3s)
                    ? r.h3s.map((h) => String(h).trim()).filter(Boolean)
                    : [];
                return {
                    h2: String(r.h2 ?? "").trim(),
                    h3Text: h3s.join("\n"),
                };
            }),
        };

        const revised = tocDraftToTopic(topic, draft);
        return NextResponse.json({ topic: revised });
    } catch (err) {
        if (isAzureRateLimitError(err)) {
            return NextResponse.json({ error: userFacingRateLimitMessage() }, { status: 429 });
        }
        if (isAzureContentFilterError(err)) {
            return NextResponse.json({ error: userFacingContentFilterMessage() }, { status: 422 });
        }
        const message = extractRouteError(err, "Could not revise TOC");
        console.error("revise-toc:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
