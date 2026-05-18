import { NextResponse } from "next/server";
import { type BusinessContext } from "@/lib/types/businessContext";
import { type TopicOption } from "@/lib/types/strategy";
import { type BlogPost } from "@/lib/types/content";
import type { TopicBrief } from "@/lib/types/topicBrief";
import { sanitizeJsonString } from "@/lib/sanitizeJson";
import { extractRouteError } from "@/lib/formatApiError";
import { assistantMessageText, azureConfigDebug, createAzureClient, getAzureConfig, stripOuterMarkdownFence } from "@/lib/azureOpenAI";

export const maxDuration = 120;

const MAX_BRIEF_CHARS = 24_000;

function buildSystemPrompt(businessContext: BusinessContext): string {
    const industry = businessContext.businessType || "the client's industry";
    const audience = businessContext.targetAudience || "their target audience";
    return `
You are an elite SEO copywriter. Write for ${businessContext.businessName || "the business"} (${industry}), targeting ${audience}.
Match the positioning and tone in BusinessContext exactly.

Generate a complete, publication-ready blog post from:
1. BusinessContext (name, location, audience, positioning, services)
2. TopicOption (title and description)
3. Optional TopicBrief — author notes and reference files. When present, treat as authoritative: weave in their angles and facts; do not contradict stated data.

REQUIREMENTS:
1. **Relevance**: Connect to location and audience when provided in BusinessContext.
2. **Structure**: H2 and H3 markdown headers, short paragraphs, bullets where useful.
3. **FAQs**: Exactly 3 FAQs with answers at the end (H2/H3).
4. **Human voice**: No em-dashes (—). Avoid "delve into", "elevate", "in today's landscape", "moreover", "in conclusion".

OUTPUT: ONLY valid JSON with keys: title, h1Title, h2Suggestions (array 3-6 strings), slug, metaDescription, contentMarkdown, faqs (array of {question, answer}).
- Escape newlines in strings as \\n and double quotes as \\".
- Do NOT include H1 in contentMarkdown; start with intro or H2.
- No markdown code fences or conversational text.
`;
}

function extractFirstJsonObject(input: string): string | null {
    const text = String(input || "");
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else if (ch === "\"") {
                inString = false;
            }
            continue;
        }

        if (ch === "\"") {
            inString = true;
            continue;
        }

        if (ch === "{") {
            if (depth === 0) start = i;
            depth++;
            continue;
        }

        if (ch === "}") {
            if (depth > 0) {
                depth--;
                if (depth === 0 && start >= 0) {
                    return text.slice(start, i + 1);
                }
            }
        }
    }

    return null;
}

function extractH2Suggestions(markdown: string): string[] {
    const matches = String(markdown || "")
        .match(/^##\s+(.+)$/gm)
        ?.map((line) => line.replace(/^##\s+/, "").trim())
        .filter(Boolean) || [];
    return Array.from(new Set(matches)).slice(0, 8);
}

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json(
            { error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() },
            { status: 500 }
        );
    }

    try {
        const { businessContext, topic, topicBrief }: {
            businessContext: BusinessContext;
            topic: TopicOption;
            topicBrief?: TopicBrief;
        } = await req.json();

        if (!businessContext || !topic) {
            return NextResponse.json(
                { error: "Missing businessContext or topic payload" },
                { status: 400 }
            );
        }

        const client = createAzureClient(azure);

        let userPrompt = `Generate the blog post JSON for the following:\n\n### Business Context\n${JSON.stringify(businessContext, null, 2)}\n\n### Approved Topic\n${JSON.stringify(topic, null, 2)}`;

        const notes = topicBrief?.userNotes?.trim();
        const files = topicBrief?.supplementaryFiles?.filter((f) => f.content?.trim()) ?? [];
        if (notes || files.length > 0) {
            userPrompt += "\n\n### Author Brief (MUST honor — infuse these thoughts and facts throughout the post)";
            if (notes) {
                userPrompt += `\n\nUser notes and direction:\n${notes.slice(0, MAX_BRIEF_CHARS)}`;
            }
            if (files.length > 0) {
                userPrompt += "\n\nSupplementary reference material:";
                let briefUsed = notes?.length ?? 0;
                for (const f of files) {
                    const room = MAX_BRIEF_CHARS - briefUsed;
                    if (room <= 0) break;
                    const chunk = f.content.trim().slice(0, room);
                    briefUsed += chunk.length;
                    userPrompt += `\n\n--- ${f.name} ---\n${chunk}`;
                }
            }
        }

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 8000,
            messages: [
                { role: "system", content: buildSystemPrompt(businessContext) },
                { role: "user", content: userPrompt },
            ],
        });
        const text = assistantMessageText((response as any)?.choices?.[0]?.message?.content);
        const deFenced = stripOuterMarkdownFence(text);

        let parsed: Partial<BlogPost> | null = null;
        const directCandidates = [deFenced, sanitizeJsonString(deFenced)];
        for (const candidate of directCandidates) {
            try {
                parsed = JSON.parse(candidate) as Partial<BlogPost>;
                break;
            } catch { }
        }

        if (!parsed) {
            const extractedObject = extractFirstJsonObject(deFenced);
            if (extractedObject) {
                const extractedCandidates = [extractedObject, sanitizeJsonString(extractedObject)];
                for (const candidate of extractedCandidates) {
                    try {
                        parsed = JSON.parse(candidate) as Partial<BlogPost>;
                        break;
                    } catch { }
                }
            }
        }

        if (!parsed) {
            throw new Error("Model returned invalid JSON format");
        }

        const postData: BlogPost = {
            title: String(parsed.title || topic.title || "Untitled Post"),
            h1Title: String(parsed.h1Title || parsed.title || topic.title || "Untitled Post"),
            h2Suggestions: Array.isArray(parsed.h2Suggestions)
                ? parsed.h2Suggestions.map((h) => String(h).trim()).filter(Boolean).slice(0, 8)
                : [],
            slug: String(parsed.slug || topic.title || "untitled-post")
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, ""),
            metaDescription: String(parsed.metaDescription || ""),
            contentMarkdown: String(parsed.contentMarkdown || ""),
            faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
            status: parsed.status === "published" ? "published" : "draft",
        };

        // Fix for Gemini over-escaping newlines into literal "\n" strings
        if (postData.contentMarkdown) {
            postData.contentMarkdown = postData.contentMarkdown.replace(/\\n/g, '\n');
            postData.contentMarkdown = postData.contentMarkdown.replace(/^#\s+[^\n]*\n+/i, '').trimStart();
        }

        if (!postData.h2Suggestions || postData.h2Suggestions.length === 0) {
            postData.h2Suggestions = extractH2Suggestions(postData.contentMarkdown);
        }

        return NextResponse.json({ data: postData });
    } catch (err) {
        const message = extractRouteError(err, "Content Agent generation failed");
        console.error("Content Agent Error:", err);
        const lower = message.toLowerCase();
        const hint = lower.includes("rate") || lower.includes("429")
            ? " Rate limit hit — wait 1 min and retry."
            : lower.includes("json") || lower.includes("parse")
                ? " LLM returned invalid JSON — retry."
                : lower.includes("context") || lower.includes("token") || lower.includes("length")
                    ? " Prompt may be too long — shorten your brief or remove large files."
                    : "";
        return NextResponse.json({ error: message + hint }, { status: 500 });
    }
}
