import type { BlogPost } from "@/lib/types/content";
import type { SeoScores } from "@/lib/types/optimization";

export type HeadingTagRow = {
    level: "h1" | "h2";
    title: string;
    densityPercent: number;
    missing?: boolean;
};

function countWords(text: string): number {
    return String(text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
}

export function countPhraseOccurrences(text: string, phrase: string): number {
    const p = phrase.trim();
    if (!p) return 0;
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped.replace(/\s+/g, "\\s+"), "gi");
    return [...String(text || "").matchAll(re)].length;
}

/** Keyword density as % of total words in the text span. */
export function keywordDensityPercent(text: string, keyword: string): number {
    const words = countWords(text);
    if (words === 0 || !keyword.trim()) return 0;
    const hits = countPhraseOccurrences(text, keyword);
    const kwWords = countWords(keyword);
    return Math.round(((hits * kwWords) / words) * 1000) / 10;
}

type H2Section = { title: string; key: string; body: string };

function normalizeHeadingKey(title: string): string {
    return String(title || "")
        .toLowerCase()
        .replace(/[''']/g, "'")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/** True when two headings are the same section (optimizer often rephrases slightly). */
function headingTitlesMatch(a: string, b: string): boolean {
    const na = normalizeHeadingKey(a);
    const nb = normalizeHeadingKey(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;

    const ta = na.split(" ").filter((w) => w.length > 2);
    const tb = nb.split(" ").filter((w) => w.length > 2);
    if (ta.length === 0 || tb.length === 0) return false;

    const tbSet = new Set(tb);
    const overlap = ta.filter((w) => tbSet.has(w)).length;
    const union = new Set([...ta, ...tb]).size;
    return union > 0 && overlap / union >= 0.55;
}

function bodyTextExcludingHeadings(markdown: string): string {
    return String(markdown || "")
        .replace(/^#{1,6}\s+.*$/gm, "")
        .trim();
}

function extractH2TitlesFromMarkdown(markdown: string): string[] {
    const titles: string[] = [];
    for (const line of String(markdown || "").split("\n")) {
        const m = line.match(/^##\s+(.+?)\s*$/);
        if (m) titles.push(m[1].trim());
    }
    return titles;
}

function parseH2Sections(markdown: string): H2Section[] {
    const sections: H2Section[] = [];
    const lines = String(markdown || "").split("\n");
    let current: H2Section | null = null;
    let buffer: string[] = [];

    const flush = () => {
        if (current) {
            current.body = buffer.join("\n").trim();
            sections.push(current);
        }
    };

    for (const line of lines) {
        const h2 = line.match(/^##\s+(.+?)\s*$/);
        if (h2) {
            flush();
            const title = h2[1].trim();
            current = { title, key: normalizeHeadingKey(title), body: "" };
            buffer = [];
            continue;
        }
        if (current) buffer.push(line);
    }
    flush();
    return sections;
}

function findSection(sections: H2Section[], title: string): H2Section | undefined {
    const key = normalizeHeadingKey(title);
    const exact = sections.find((s) => s.key === key);
    if (exact) return exact;
    return sections.find((s) => headingTitlesMatch(s.title, title));
}

function introBeforeFirstH2(markdown: string): string {
    const idx = String(markdown || "").search(/^##\s+/m);
    if (idx < 0) return String(markdown || "").trim();
    return String(markdown || "")
        .slice(0, idx)
        .replace(/^#\s+[^\n]*\n?/m, "")
        .trim();
}

/**
 * Heading-tag table: each row’s density is how often that heading’s wording appears
 * in the relevant body text (intro for H1, section copy for H2), not the primary keyword.
 */
export function buildHeadingTagRows(
    markdown: string,
    post: Pick<BlogPost, "h1Title" | "h2Suggestions" | "title">,
): HeadingTagRow[] {
    const h1Title = (post.h1Title || post.title || "").trim();
    const sections = parseH2Sections(markdown);
    const bodyText = bodyTextExcludingHeadings(markdown);
    const rows: HeadingTagRow[] = [];

    if (h1Title) {
        const h1Span = introBeforeFirstH2(markdown) || bodyText;
        rows.push({
            level: "h1",
            title: h1Title,
            densityPercent: keywordDensityPercent(h1Span, h1Title),
        });
    }

    const plannedH2 =
        (post.h2Suggestions || []).map((h) => h.trim()).filter(Boolean).length > 0
            ? (post.h2Suggestions || []).map((h) => h.trim()).filter(Boolean)
            : extractH2TitlesFromMarkdown(markdown);

    const matchedSectionKeys = new Set<string>();

    for (const h2 of plannedH2) {
        const section = findSection(sections, h2);
        if (section) {
            matchedSectionKeys.add(section.key);
            const span = section.body.trim() ? section.body : bodyText;
            rows.push({
                level: "h2",
                title: section.title,
                densityPercent: keywordDensityPercent(span, section.title),
            });
            continue;
        }

        const densityInDraft = keywordDensityPercent(bodyText, h2);
        rows.push({
            level: "h2",
            title: h2,
            densityPercent: densityInDraft,
            missing: densityInDraft === 0,
        });
    }

    for (const section of sections) {
        if (matchedSectionKeys.has(section.key)) continue;
        const span = section.body.trim() ? section.body : bodyText;
        rows.push({
            level: "h2",
            title: section.title,
            densityPercent: keywordDensityPercent(span, section.title),
        });
    }

    return rows;
}

export function normalizeSeoScores(
    raw: Partial<SeoScores> | null | undefined,
    plagiarismSimilarity = 0,
): SeoScores {
    const readability = Number(raw?.readability ?? 80);
    const grammar = Number(raw?.grammar ?? raw?.contentStructure ?? 85);
    const aiContentPercent = Number(raw?.aiContentPercent ?? 15);
    return {
        readability: Math.min(100, Math.max(0, readability)),
        grammar: Math.min(100, Math.max(0, grammar)),
        aiContentPercent: Math.min(100, Math.max(0, aiContentPercent)),
        originality: Math.min(
            100,
            Math.max(0, Number(raw?.originality ?? 100 - plagiarismSimilarity)),
        ),
        actionableInsights: Array.isArray(raw?.actionableInsights) ? raw!.actionableInsights : [],
    };
}

export function seoQualityTotal(scores: SeoScores): number {
    return scores.readability + scores.grammar + scores.originality + (100 - scores.aiContentPercent);
}
