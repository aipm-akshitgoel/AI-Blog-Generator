/**
 * SEO Review Tools — Readability score API (content input).
 * @see https://api.seoreviewtools.com/documentation/readability-score-api-content/
 */

import {
    isMarkdownTableLine,
    isMarkdownTableSeparatorLine,
    markdownTableToHtml,
    normalizeMarkdownTables,
} from "@/lib/markdownStructure";

export const SEO_REVIEW_TOOLS_READABILITY_URL =
    "https://api.seoreviewtools.com/readability-score/?content=1";

export const READABILITY_TARGET_GRADE_MAX = 8;
export const READABILITY_TARGET_GRADE_MIN = 7;
export const READABILITY_MAX_ATTEMPTS = 3;

export type ReadabilityGradeResult = {
    /** Parsed numeric grade (e.g. 7 from "7th grade"). */
    gradeLevel: number;
    gradeLabel: string;
    fleschScore: number;
    fleschLabel: string;
    fleschClass?: string;
    words: number;
    sentences: number;
    paragraphs: number;
    readingTime?: string;
    raw?: unknown;
};

export function getSeoReviewToolsApiKey(): string | null {
    const key = process.env.SEO_REVIEW_TOOLS_API_KEY?.trim();
    return key || null;
}

/** Parse "7th grade", "8th grade", "college", etc. into a numeric level for comparison. */
export function parseGradeLevel(label: string): number {
    const raw = String(label || "").trim().toLowerCase();
    if (!raw) return 99;

    const ordinal = raw.match(/(\d+)(?:st|nd|rd|th)?\s*grade/);
    if (ordinal) return Number(ordinal[1]);

    if (raw.includes("college") || raw.includes("university")) return 13;
    if (raw.includes("graduate")) return 14;
    if (raw.includes("professional")) return 15;

    const plain = raw.match(/^(\d+)\s*$/);
    if (plain) return Number(plain[1]);

    return 99;
}

export function meetsReadabilityTarget(gradeLevel: number): boolean {
    return gradeLevel <= READABILITY_TARGET_GRADE_MAX;
}

/** Map Flesch Reading Ease (0–100) to the optimizer UI 0–100 readability bar. */
export function fleschEaseToReadabilityPercent(fleschScore: number): number {
    return Math.min(100, Math.max(0, Math.round(fleschScore)));
}

/** Minimal HTML for the SEO Review Tools content endpoint (paragraphs + headings + tables). */
export function markdownToReadabilityHtml(markdown: string): string {
    const lines = normalizeMarkdownTables(String(markdown || "")).split(/\r?\n/);
    const parts: string[] = [];
    let paragraph: string[] = [];

    const flushParagraph = () => {
        const text = paragraph.join(" ").trim();
        if (text) parts.push(`<p>${escapeHtml(text)}</p>`);
        paragraph = [];
    };

    let i = 0;
    while (i < lines.length) {
        const trimmed = lines[i]!.trim();
        if (!trimmed) {
            flushParagraph();
            i++;
            continue;
        }
        if (/^#{1,6}\s+/.test(trimmed)) {
            flushParagraph();
            const level = trimmed.match(/^#+/)?.[0].length ?? 2;
            const tag = level <= 1 ? "h2" : level === 2 ? "h2" : "h3";
            const text = trimmed.replace(/^#+\s+/, "").replace(/\[(.+?)\]\([^)]+\)/g, "$1");
            parts.push(`<${tag}>${escapeHtml(text)}</${tag}>`);
            i++;
            continue;
        }
        if (isMarkdownTableLine(trimmed)) {
            flushParagraph();
            const tableLines: string[] = [];
            while (i < lines.length) {
                const lt = lines[i]!.trim();
                if (!lt) break;
                if (isMarkdownTableLine(lt) || isMarkdownTableSeparatorLine(lt)) {
                    tableLines.push(lines[i]!);
                    i++;
                } else {
                    break;
                }
            }
            const tableHtml = markdownTableToHtml(tableLines.join("\n"));
            if (tableHtml) parts.push(tableHtml);
            continue;
        }
        const plain = trimmed
            .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
            .replace(/[*_`]/g, "");
        paragraph.push(plain);
        i++;
    }
    flushParagraph();

    if (parts.length === 0) {
        return "<p></p>";
    }
    return parts.join("\n");
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Full HTML document for the readability content endpoint (same transport as content-analysis). */
export function buildReadabilityHtmlFromMarkdown(
    markdown: string,
    title = "Article",
): string {
    const body = markdownToReadabilityHtml(markdown);
    return `<html>
<head>
<title>${escapeHtml(title)}</title>
</head>
<body>
${body}
</body>
</html>`;
}

function pickFleschBlock(data: Record<string, unknown>): Record<string, unknown> | null {
    const nested = data?.data as Record<string, unknown> | undefined;
    const inner = nested?.data as Record<string, unknown> | undefined;
    const fk =
        (inner?.["Flesch Kincaid Reading Ease"] as Record<string, unknown>) ??
        (nested?.["Flesch Kincaid Reading Ease"] as Record<string, unknown>) ??
        (data?.["Flesch Kincaid Reading Ease"] as Record<string, unknown>);
    return fk ?? null;
}

export function parseReadabilityApiResponse(json: unknown): ReadabilityGradeResult | null {
    if (!json || typeof json !== "object") return null;
    const root = json as Record<string, unknown>;
    if (root.status !== "ok" && root.result !== 1) return null;

    const data = (root.data as Record<string, unknown>) ?? root;
    const fk = pickFleschBlock(data);
    if (!fk) return null;

    const gradeLabel = String(fk["grade level"] ?? fk.gradeLevel ?? "").trim();
    const gradeLevel = parseGradeLevel(gradeLabel);
    const fleschScore = Number(fk.score ?? fk.Score ?? 0);
    if (!Number.isFinite(fleschScore)) return null;

    const stats = (data.data as Record<string, unknown>) ?? nestedStats(data) ?? data;

    return {
        gradeLevel,
        gradeLabel: gradeLabel || `${gradeLevel}th grade`,
        fleschScore,
        fleschLabel: String(fk.label ?? ""),
        fleschClass: String(fk.class ?? ""),
        words: Number(stats.Words ?? stats.words ?? 0),
        sentences: Number(stats.Sentences ?? stats.sentences ?? 0),
        paragraphs: Number(stats.Paragraphs ?? stats.paragraphs ?? 0),
        readingTime: String(stats["Reading time"] ?? stats.readingTime ?? ""),
        raw: json,
    };
}

function nestedStats(data: Record<string, unknown>): Record<string, unknown> | undefined {
    const nested = data.data as Record<string, unknown> | undefined;
    if (nested && (nested.Words != null || nested.words != null)) return nested;
    return undefined;
}

export async function fetchReadabilityScore(
    markdown: string,
    apiKey?: string | null,
    options?: { title?: string },
): Promise<ReadabilityGradeResult | null> {
    const key = apiKey ?? getSeoReviewToolsApiKey();
    if (!key) {
        console.warn("[readability] SEO_REVIEW_TOOLS_API_KEY is not set");
        return null;
    }

    const html = buildReadabilityHtmlFromMarkdown(markdown, options?.title);
    const url = `${SEO_REVIEW_TOOLS_READABILITY_URL}&key=${encodeURIComponent(key)}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/html; charset=utf-8" },
        body: html,
    });

    const responseText = await res.text().catch(() => "");

    if (!res.ok) {
        console.warn("[readability] SEO Review Tools HTTP", res.status, responseText.slice(0, 300));
        return null;
    }

    let json: unknown;
    try {
        json = JSON.parse(responseText);
    } catch {
        console.warn("[readability] SEO Review Tools returned non-JSON", responseText.slice(0, 300));
        return null;
    }

    const parsed = parseReadabilityApiResponse(json);
    if (!parsed) {
        console.warn("[readability] Could not parse SEO Review Tools response", JSON.stringify(json).slice(0, 500));
    }
    return parsed;
}
