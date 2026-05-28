import { markdownToReadabilityHtml } from "@/lib/seoReviewToolsReadability";
import { getSeoReviewToolsApiKey } from "@/lib/seoReviewToolsReadability";

export const SEO_REVIEW_TOOLS_CONTENT_ANALYSIS_URL =
    "https://api.seoreviewtools.com/seo-content-analysis/";

export type SeoReviewToolsKeywordDensityResult = {
    keyword: string;
    densityPercent: number;
    frequency: number;
    keywordType?: string;
    raw?: unknown;
};

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function parseDensityPercentString(value: unknown): number {
    const raw = String(value ?? "").trim().replace("%", "");
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

/** Full HTML document for SEO Review Tools content analysis (matches their examples). */
export function buildContentAnalysisHtml(input: {
    title: string;
    h1Title: string;
    metaDescription: string;
    bodyMarkdown: string;
}): string {
    const h1 = input.h1Title.trim() || input.title.trim();
    const body = markdownToReadabilityHtml(input.bodyMarkdown);
    return `<html>
<head>
<title>${escapeHtml(input.title)}</title>
<meta name="description" content="${escapeHtml(input.metaDescription)}">
</head>
<body>
<h1>${escapeHtml(h1)}</h1>
${body}
</body>
</html>`;
}

export function parseKeywordDensityFromAnalysis(json: unknown): SeoReviewToolsKeywordDensityResult | null {
    if (!json || typeof json !== "object") return null;
    const root = json as Record<string, unknown>;
    if (root.status !== "ok" && root.result !== 1) return null;

    const data = (root.data as Record<string, unknown>) ?? root;
    const block = data["Keyword density"] as Record<string, unknown> | undefined;
    if (!block) return null;

    return {
        keyword: String(block.Keyword ?? block.keyword ?? "").trim(),
        densityPercent: parseDensityPercentString(block["Keyword density"] ?? block.density),
        frequency: Number(block.Frequency ?? block.frequency ?? 0) || 0,
        keywordType: String(block["Keyword type"] ?? block.keywordType ?? ""),
        raw: block,
    };
}

/**
 * SEO Review Tools — content analysis with focus keyword (returns overall keyword density %).
 * @see https://api.seoreviewtools.com/documentation/seo-content-analysis-api/content/v-3-0/
 */
export async function fetchSeoReviewToolsKeywordDensity(
    html: string,
    focusKeyword: string,
    options?: { relatedKeywords?: string[]; apiKey?: string | null },
): Promise<SeoReviewToolsKeywordDensityResult | null> {
    const key = options?.apiKey ?? getSeoReviewToolsApiKey();
    const keyword = focusKeyword.trim();
    if (!key || !keyword || !html.trim()) return null;

    const params = new URLSearchParams({
        "content": "1",
        keyword,
        key,
    });
    const related = (options?.relatedKeywords ?? []).map((k) => k.trim()).filter(Boolean);
    if (related.length >= 3) {
        params.set("relatedkeywords", related.join("|"));
    }

    const url = `${SEO_REVIEW_TOOLS_CONTENT_ANALYSIS_URL}?${params.toString()}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: html,
    });

    if (!res.ok) {
        console.warn("[seo-review-tools] content-analysis HTTP", res.status, focusKeyword);
        return null;
    }

    const json = await res.json().catch(() => null);
    const parsed = parseKeywordDensityFromAnalysis(json);
    if (parsed && !parsed.keyword) {
        return { ...parsed, keyword };
    }
    return parsed;
}
