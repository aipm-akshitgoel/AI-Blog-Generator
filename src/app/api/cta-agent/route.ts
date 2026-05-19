import { NextResponse } from "next/server";
import type { OptimizedContent } from "@/lib/types/optimization";
import type { BusinessContext } from "@/lib/types/businessContext";
import type { CTAData } from "@/lib/types/cta";
import { parseJsonFromModelText } from "@/lib/parseModelJson";
import {
    assistantMessageText,
    azureConfigDebug,
    createAzureClient,
    getAzureConfig,
} from "@/lib/azureOpenAI";

const CTA_MARKDOWN_MAX = 8_000;
const HEADLINE_MAX = 80;
const COPY_MAX = 280;
const BUTTON_MAX = 32;

function truncateMarkdown(markdown: string): string {
    const t = String(markdown || "").trim();
    if (t.length <= CTA_MARKDOWN_MAX) return t;
    return `${t.slice(0, CTA_MARKDOWN_MAX)}\n\n[Article truncated for CTA generation.]`;
}

function clip(text: string, max: number): string {
    const s = String(text || "").trim();
    if (s.length <= max) return s;
    const cut = s.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/** Prefer configured domain / canonical URL — never invent URLs from business name. */
function resolveBusinessSiteUrl(ctx: BusinessContext): string {
    const canonical = ctx.seoDefaults?.canonicalBaseUrl?.trim();
    if (canonical) {
        const withProto = /^https?:\/\//i.test(canonical) ? canonical : `https://${canonical}`;
        return withProto.replace(/\/+$/, "");
    }
    const raw = ctx.domain?.trim();
    if (!raw) return "";
    const host = raw.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/,+$/, "");
    if (!host || !host.includes(".")) return "";
    return `https://${host}`;
}

function sanitizeUrl(input: string, fallback: string): string {
    let s = String(input || "").trim().replace(/,+$/, "");
    if (!s) return fallback;
    if (!/^https?:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;
    try {
        const u = new URL(s);
        return u.href.replace(/\/$/, "") || fallback;
    } catch {
        return fallback;
    }
}

function inferDefaultButton(ctx: BusinessContext, articleTitle: string): string {
    const blob = `${ctx.businessType} ${ctx.businessName} ${ctx.positioning} ${articleTitle}`.toLowerCase();
    if (/\b(degree|education|university|college|mba|course|program|learn|student|career)\b/.test(blob)) {
        return "Explore Programs";
    }
    if (/\b(salon|spa|barber|beauty|appointment|book)\b/.test(blob)) {
        return "Book Now";
    }
    if (/\b(saas|software|demo|trial|platform)\b/.test(blob)) {
        return "Get Started";
    }
    return "Learn More";
}

function normalizeCtaPayload(
    raw: unknown,
    ctx: BusinessContext,
    articleTitle: string,
): CTAData | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const siteUrl = resolveBusinessSiteUrl(ctx);
    const defaultLink = siteUrl || "https://example.com";
    const ctaCopy = clip(String(o.ctaCopy ?? ""), COPY_MAX);
    if (!ctaCopy) return null;

    return {
        ctaHeadline: clip(String(o.ctaHeadline ?? ""), HEADLINE_MAX) || undefined,
        ctaCopy,
        ctaButtonText:
            clip(String(o.ctaButtonText ?? ""), BUTTON_MAX) ||
            inferDefaultButton(ctx, articleTitle),
        ctaLink: sanitizeUrl(String(o.ctaLink ?? ""), defaultLink),
        ctaImageUrl: undefined,
    };
}

function buildFallbackCta(
    optimized: OptimizedContent,
    ctx: BusinessContext,
): CTAData {
    const articleTitle = optimized.title?.trim() || "this topic";
    const brand = ctx.businessName?.trim() || "our team";
    const siteUrl = resolveBusinessSiteUrl(ctx);
    const button = inferDefaultButton(ctx, articleTitle);
    const shortTitle = articleTitle.length > 72 ? `${articleTitle.slice(0, 69)}…` : articleTitle;

    const ctaHeadline = clip(`Ready to take the next step on ${shortTitle}?`, HEADLINE_MAX);
    const ctaCopy = clip(
        `Get personalized guidance from ${brand} on ${shortTitle.toLowerCase().replace(/\.$/, "")}. ` +
            (ctx.targetAudience?.trim()
                ? `Built for ${ctx.targetAudience.trim()}.`
                : "Start your journey today."),
        COPY_MAX,
    );

    return {
        ctaHeadline,
        ctaCopy,
        ctaButtonText: button,
        ctaLink: siteUrl || sanitizeUrl("", "https://example.com"),
    };
}

export async function POST(req: Request) {
    let body: {
        optimizedContent?: OptimizedContent;
        businessContext?: BusinessContext;
        topicTitle?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { optimizedContent, businessContext, topicTitle } = body;
    if (!optimizedContent || !businessContext) {
        return NextResponse.json(
            { error: "Missing optimizedContent or businessContext payload" },
            { status: 400 },
        );
    }

    const articleTitle =
        topicTitle?.trim() || optimizedContent.title?.trim() || "your blog topic";
    const fallback = buildFallbackCta(optimizedContent, businessContext);

    const azure = getAzureConfig();
    if (!azure) {
        return NextResponse.json(
            {
                cta: fallback,
                updatedMarkdown: optimizedContent.contentMarkdown,
                parseWarning:
                    "Azure OpenAI is not configured. Showing a CTA based on your article title and business profile.",
            },
            { status: 200 },
        );
    }

    const siteUrl = resolveBusinessSiteUrl(businessContext);
    const services = (businessContext.services ?? []).slice(0, 8).join(", ");

    try {
        const client = createAzureClient(azure);
        const systemPrompt = `You write conversion CTAs for blog posts. The CTA MUST match:
1) The article H1/title (primary topic of the post)
2) The business brand, audience, and website domain

RULES:
- ctaHeadline: one short line tied to the article topic (max ${HEADLINE_MAX} chars). Do NOT use generic salon/fashion phrases like "elevate your look" unless the business is beauty/wellness.
- ctaCopy: 1–2 sentences; mention the article topic and a clear next step for THIS business (max ${COPY_MAX} chars).
- ctaButtonText: short action label (max ${BUTTON_MAX} chars), appropriate to the industry (e.g. "Explore Programs" for education, "Book Now" only for appointment businesses).
- ctaLink: MUST be a valid https URL. Use the business site URL provided when it fits; do not invent random domains or append commas.

OUTPUT ONLY valid JSON:
{ "ctaHeadline": "...", "ctaCopy": "...", "ctaButtonText": "...", "ctaLink": "https://..." }
No markdown fences or extra text.`;

        const userPrompt = `Article H1: ${articleTitle}
Meta description: ${optimizedContent.metaDescription || "(none)"}

Business:
- Name: ${businessContext.businessName}
- Type: ${businessContext.businessType}
- Domain / site: ${siteUrl || businessContext.domain || "(not set — use a sensible path on the brand domain if you know it)"}
- Audience: ${businessContext.targetAudience || "(general)"}
- Positioning: ${businessContext.positioning || "(none)"}
- Services: ${services || "(none)"}

Article excerpt:
${truncateMarkdown(optimizedContent.contentMarkdown)}`;

        const response = await client.chat.completions.create({
            model: azure.deployment,
            max_completion_tokens: 600,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        const choice = (response as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0];
        const text = assistantMessageText(choice?.message?.content);
        const parsed = parseJsonFromModelText<unknown>(text);
        const cta = normalizeCtaPayload(parsed, businessContext, articleTitle);

        if (cta) {
            return NextResponse.json(
                { cta, updatedMarkdown: optimizedContent.contentMarkdown },
                { status: 200 },
            );
        }

        console.warn("[cta-agent] Using fallback CTA; invalid model JSON.", { textLength: text.length });
        return NextResponse.json(
            {
                cta: fallback,
                updatedMarkdown: optimizedContent.contentMarkdown,
                parseWarning:
                    "AI CTA could not be read. Showing a draft based on your article title and business profile.",
            },
            { status: 200 },
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "CTA generation failed";
        console.error("[cta-agent]", message);
        return NextResponse.json(
            {
                cta: fallback,
                updatedMarkdown: optimizedContent.contentMarkdown,
                parseWarning: `CTA generation hit an error (${message}). Showing a draft from your article and business profile.`,
            },
            { status: 200 },
        );
    }
}
