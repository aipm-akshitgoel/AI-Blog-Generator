import { NextResponse } from "next/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { MetaOption, MetaSeoPayload } from "@/lib/types/meta";
import type { SeoDefaults } from "@/lib/types/businessContext";
import { parseJsonFromModelText } from "@/lib/parseModelJson";
import {
    assistantMessageText,
    azureConfigDebug,
    createAzureClient,
    getAzureConfig,
} from "@/lib/azureOpenAI";

const TITLE_LIMIT = 60;
const DESC_LIMIT = 160;
const META_PROMPT_MARKDOWN_MAX = 12_000;

/** Hard truncate at word boundary without exceeding limit */
function hardTruncate(text: string, limit: number): string {
    if (text.length <= limit) return text;
    const trimmed = text.slice(0, limit);
    const lastSpace = trimmed.lastIndexOf(" ");
    return (lastSpace > limit * 0.7 ? trimmed.slice(0, lastSpace) : trimmed).trimEnd();
}

function stripMarkdownForDesc(markdown: string): string {
    return String(markdown || "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`>#]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function truncateMarkdownForPrompt(markdown: string): string {
    const t = String(markdown || "").trim();
    if (t.length <= META_PROMPT_MARKDOWN_MAX) return t;
    return `${t.slice(0, META_PROMPT_MARKDOWN_MAX)}\n\n[Article truncated for meta generation.]`;
}

function normalizeMetaPayload(raw: unknown, seoDefaults?: SeoDefaults): MetaSeoPayload | null {
    if (!raw || typeof raw !== "object") return null;
    const options = (raw as { options?: unknown }).options;
    if (!Array.isArray(options) || options.length === 0) return null;

    const normalized: MetaOption[] = [];
    for (const item of options) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const title = hardTruncate(String(o.title ?? "").trim(), TITLE_LIMIT);
        const description = hardTruncate(String(o.description ?? "").trim(), DESC_LIMIT);
        if (!title || !description) continue;
        normalized.push({
            title,
            description,
            explanation: String(o.explanation ?? "").trim() || "AI-generated meta option.",
            category: typeof o.category === "string" ? o.category.trim() : undefined,
        });
    }

    if (normalized.length === 0) return null;

    const defaultCat = seoDefaults?.defaultPostCategory?.trim();
    if (defaultCat) {
        for (const opt of normalized) {
            if (!opt.category) opt.category = defaultCat;
        }
    }

    return { options: normalized.slice(0, 3) };
}

function buildFallbackMetaPayload(
    optimized: OptimizedContent,
    seoDefaults?: SeoDefaults,
): MetaSeoPayload {
    const baseTitle = hardTruncate(
        optimized.title?.trim() || "Blog post",
        TITLE_LIMIT,
    );
    const plain = stripMarkdownForDesc(optimized.contentMarkdown);
    const baseDesc = hardTruncate(
        optimized.metaDescription?.trim() || plain.slice(0, 220) || baseTitle,
        DESC_LIMIT,
    );
    const category = seoDefaults?.defaultPostCategory?.trim() || "Guide";

    const options: MetaOption[] = [
        {
            title: baseTitle,
            description: baseDesc,
            explanation: "Built from your article title and opening (AI meta response was empty or invalid).",
            category,
        },
    ];

    if (baseTitle.length > 20) {
        options.push({
            title: hardTruncate(`${baseTitle.replace(/[.:|–-].*$/, "").trim()}: A Practical Guide`, TITLE_LIMIT),
            description: baseDesc,
            explanation: "Alternate title variant from your draft.",
            category,
        });
    }

    const questionTitle = baseTitle.endsWith("?")
        ? baseTitle
        : hardTruncate(`${baseTitle.replace(/\.$/, "")}?`, TITLE_LIMIT);
    if (questionTitle !== baseTitle) {
        options.push({
            title: questionTitle,
            description: hardTruncate(
                `Get clear, practical guidance on ${baseTitle.replace(/\.$/, "").toLowerCase()}. ${baseDesc}`.slice(0, 320),
                DESC_LIMIT,
            ),
            explanation: "Question-style title variant.",
            category,
        });
    }

    return { options: options.slice(0, 3) };
}

export async function POST(req: Request) {
    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json(
            { error: "Azure OpenAI is not configured on the server", debug: azureConfigDebug() },
            { status: 500 },
        );
    }

    let body: { optimizedContent?: OptimizedContent; seoDefaults?: SeoDefaults };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { optimizedContent, seoDefaults } = body;
    if (!optimizedContent) {
        return NextResponse.json({ error: "Missing optimizedContent" }, { status: 400 });
    }

    const fallback = buildFallbackMetaPayload(optimizedContent, seoDefaults);

    try {
        const client = createAzureClient(azure);
        const systemPrompt = `You are a meta data specialist. Generate 3 compelling Meta Title and Meta Description options for the provided blog post.

STRICT CHARACTER LIMITS — THIS IS THE MOST IMPORTANT RULE:
- Meta Title: MAXIMUM 60 characters (count every character including spaces). NEVER exceed 60.
- Meta Description: MAXIMUM 155 characters (count every character including spaces). NEVER exceed 155.

Before outputting, COUNT the characters in each title and description. If it exceeds the limit, SHORTEN it until it fits.

GOOD examples (acceptable):
- Title (52 chars): "Luxury Home Builders in Singapore: Top 10 Tips"
- Description (148 chars): "Looking for a trusted luxury home builder in Singapore? Our expert guide covers credentials, portfolios, and pricing to help you choose wisely."

BAD examples (NOT acceptable — too long):
- Title (68 chars): "How to Choose a Luxury Home Builder in Singapore: A Complete Guide"
- Description (165 chars): "Building a luxury home in Singapore? Our 10-point checklist helps you vet builders on credentials, portfolios, and quality. Find the right partner for your dream home."

CATEGORY ASSIGNMENT:
Also assign a single content-type category label based on the blog post's format and purpose.
Choose ONLY from this list: Tips, Guide, Trends, How-To, Case Study, Opinion, News, Checklist, Listicle, Review
- Use "Tips" for advice-based posts
- Use "Guide" or "How-To" for instructional posts
- Use "Checklist" for step-by-step or point-based posts
- Use "Listicle" for numbered list posts
- Use "Trends" for industry trend posts
- Do NOT use the business's industry (e.g. never use "hair", "salon", "construction" as category)
${seoDefaults?.defaultPostCategory ? `- Prefer this default category when it fits naturally: "${seoDefaults.defaultPostCategory}".` : ""}

OUTPUT ONLY a valid JSON object: { "options": [{ "title": "...", "description": "...", "explanation": "...", "category": "..." }] }
No markdown, no extra text, no code fences.`;

        const bodyMarkdown = truncateMarkdownForPrompt(optimizedContent.contentMarkdown);
        const prompt = `Blog Post Content:\nTitle: ${optimizedContent.title}\nDescription: ${optimizedContent.metaDescription}\n\n${bodyMarkdown}\n\nSEO Defaults:\n${JSON.stringify(seoDefaults || {}, null, 2)}`;

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 1800,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
        });

        const choice = (response as { choices?: { message?: { content?: unknown }; finish_reason?: string }[] })
            ?.choices?.[0];
        const text = assistantMessageText(choice?.message?.content);
        const parsed = parseJsonFromModelText<unknown>(text);
        const payload = normalizeMetaPayload(parsed, seoDefaults);

        if (payload) {
            return NextResponse.json({ payload }, { status: 200 });
        }

        console.warn("[meta-seo] Using fallback meta options.", {
            finishReason: choice?.finish_reason,
            textLength: text.length,
        });
        return NextResponse.json(
            {
                payload: fallback,
                parseWarning:
                    "AI meta options could not be read. Showing titles and descriptions derived from your article — edit them or tap Regenerate.",
            },
            { status: 200 },
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Meta SEO generation failed";
        console.error("[meta-seo]", message);
        return NextResponse.json(
            {
                payload: fallback,
                parseWarning: `Meta generation hit an error (${message}). Showing fallback options from your article.`,
            },
            { status: 200 },
        );
    }
}
