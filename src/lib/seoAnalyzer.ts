import { stripFaqBlockFromMarkdown } from "@/lib/contentWordCount";
import type { BlogPost } from "@/lib/types/content";
import type { ContentConstraints } from "@/lib/types/contentSpec";
import type { SeoScores } from "@/lib/types/optimization";

export type HeadingTagRow = {
    level: "h1" | "h2" | "h3";
    title: string;
    densityPercent: number;
    missing?: boolean;
};

export type KeywordDensityRow = {
    level: "primary" | "secondary" | "tertiary" | "domain";
    label: string;
    keyword: string;
    densityPercent: number;
    targetPercent?: number;
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

/**
 * Keyword density as % of total words in the text span.
 * Uses keyword-word weighting (each occurrence adds the phrase’s word count).
 * Prefer `keywordDensityPercentSeoReviewTools` when aligning with SEO Review Tools API.
 */
export function keywordDensityPercent(text: string, keyword: string): number {
    const words = countWords(text);
    if (words === 0 || !keyword.trim()) return 0;
    const hits = countPhraseOccurrences(text, keyword);
    const kwWords = countWords(keyword);
    return Math.round(((hits * kwWords) / words) * 1000) / 10;
}

/**
 * SEO Review Tools content-analysis formula: (occurrences ÷ total words) × 100.
 * @see https://api.seoreviewtools.com/documentation/seo-content-analysis-api/content/
 */
export function keywordDensityPercentSeoReviewTools(text: string, keyword: string): number {
    const words = countWords(text);
    if (words === 0 || !keyword.trim()) return 0;
    const hits = countPhraseOccurrences(text, keyword);
    return Math.round((hits / words) * 1000) / 10;
}

/** Plain article body for keyword-plan measurement (excl. markdown H1 line). */
export function keywordPlanPlainText(markdown: string): string {
    const body = String(markdown || "")
        .replace(/^#\s+[^\n]+\n?/m, "")
        .trim();
    return plainTextFromMarkdown(body);
}

/**
 * Keyword plan density: full article body, weighted by phrase word count per occurrence.
 * Matches how writers set targetDensityPercent (typical primary ~1–2%).
 */
export function keywordPlanDensityPercent(markdown: string, phrase: string): number {
    return keywordDensityPercent(keywordPlanPlainText(markdown), phrase);
}

/** Occurrences still needed to reach a weighted keyword-plan target. */
export function keywordPlanOccurrencesNeeded(
    markdown: string,
    phrase: string,
    targetPercent: number,
): number {
    const plain = keywordPlanPlainText(markdown);
    const words = countWords(plain);
    const kwWords = countWords(phrase);
    if (words === 0 || !phrase.trim() || kwWords === 0) return 0;
    const current = countPhraseOccurrences(plain, phrase);
    const needed = Math.ceil(((targetPercent / 100) * words) / kwWords);
    return Math.max(0, needed - current);
}

const DENSITY_STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "for",
    "to",
    "of",
    "in",
    "on",
    "at",
    "is",
    "are",
    "was",
    "were",
    "be",
    "by",
    "with",
    "as",
    "vs",
    "your",
    "you",
    "how",
    "what",
    "which",
    "that",
    "this",
    "from",
]);

export function plainTextFromMarkdown(md: string): string {
    return String(md || "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`>#]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function sectionMarkdownWithHeading(title: string, body: string): string {
    const t = title.trim();
    const b = body.trim();
    return b ? `## ${t}\n\n${b}` : `## ${t}`;
}

/**
 * How strongly this heading’s wording shows up in its section (H1 intro or H2 block).
 * Uses the full heading phrase when present, otherwise distinctive heading terms in the section.
 */
export function headingDensityPercent(sectionMarkdown: string, headingTitle: string): number {
    const plain = plainTextFromMarkdown(sectionMarkdown);
    const words = countWords(plain);
    if (words === 0 || !headingTitle.trim()) return 0;

    const phraseDensity = keywordDensityPercent(plain, headingTitle);
    if (phraseDensity > 0) return phraseDensity;

    const terms = headingTitle
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !DENSITY_STOP_WORDS.has(w));

    if (terms.length === 0) return 0;

    let termWordHits = 0;
    for (const term of terms) {
        termWordHits += countPhraseOccurrences(plain, term);
    }

    return Math.round(((termWordHits / words) * 100) * 10) / 10;
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
export function headingTitlesMatch(a: string, b: string): boolean {
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

export function parseH2Sections(markdown: string): H2Section[] {
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

/** Whether an H2 or H3 heading in the article matches the planned section title (fuzzy). */
export function sectionTitleMatchesMarkdown(markdown: string, sectionTitle: string): boolean {
    const title = sectionTitle.trim();
    if (!title) return true;
    const h2s = parseH2Sections(markdown);
    if (findSection(h2s, title)) return true;
    for (const h2 of h2s) {
        if (parseH3Sections(h2.body).some((h3) => headingTitlesMatch(h3.title, title))) {
            return true;
        }
    }
    return false;
}

export function introBeforeFirstH2(markdown: string): string {
    const idx = String(markdown || "").search(/^##\s+/m);
    if (idx < 0) return String(markdown || "").trim();
    return String(markdown || "")
        .slice(0, idx)
        .replace(/^#\s+[^\n]*\n?/m, "")
        .trim();
}

type H3Section = { title: string; body: string };

/** H2 section copy for keyword density — excludes ### heading lines only. */
function h2BodyForKeywordDensity(h2Body: string): string {
    return String(h2Body || "")
        .split("\n")
        .filter((line) => !/^###\s+/.test(line.trim()))
        .join("\n");
}

export function parseH3Sections(h2Body: string): H3Section[] {
    const sections: H3Section[] = [];
    const lines = String(h2Body || "").split("\n");
    let current: H3Section | null = null;
    let buffer: string[] = [];

    const flush = () => {
        if (current) {
            current.body = buffer.join("\n").trim();
            sections.push(current);
        }
    };

    for (const line of lines) {
        const h3 = line.match(/^###\s+(.+?)\s*$/);
        if (h3) {
            flush();
            current = { title: h3[1].trim(), body: "" };
            buffer = [];
            continue;
        }
        if (current) buffer.push(line);
    }
    flush();
    return sections;
}

/** Full article body plain text (no FAQs, no heading lines) for domain keyword density. */
export function articleBodyPlainText(markdown: string): string {
    return plainTextFromMarkdown(stripFaqBlockFromMarkdown(markdown));
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
        const intro = introBeforeFirstH2(markdown);
        const h1Span = intro ? `# ${h1Title}\n\n${intro}` : `# ${h1Title}`;
        rows.push({
            level: "h1",
            title: h1Title,
            densityPercent: headingDensityPercent(h1Span, h1Title),
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
            const span = sectionMarkdownWithHeading(
                section.title,
                section.body.trim() ? section.body : bodyText,
            );
            rows.push({
                level: "h2",
                title: section.title,
                densityPercent: headingDensityPercent(span, section.title),
            });
            continue;
        }

        const span = sectionMarkdownWithHeading(h2, bodyText);
        const densityInDraft = headingDensityPercent(span, h2);
        rows.push({
            level: "h2",
            title: h2,
            densityPercent: densityInDraft,
            missing: densityInDraft === 0,
        });
    }

    for (const section of sections) {
        if (matchedSectionKeys.has(section.key)) continue;
        const span = sectionMarkdownWithHeading(
            section.title,
            section.body.trim() ? section.body : bodyText,
        );
        rows.push({
            level: "h2",
            title: section.title,
            densityPercent: headingDensityPercent(span, section.title),
        });

        for (const h3 of parseH3Sections(section.body)) {
            const h3Span = h3.body.trim() ? `### ${h3.title}\n\n${h3.body}` : `### ${h3.title}`;
            rows.push({
                level: "h3",
                title: h3.title,
                densityPercent: headingDensityPercent(h3Span, h3.title),
                missing: !h3.body.trim(),
            });
        }
    }

    return rows;
}

export function normalizeSeoScores(
    raw: Partial<SeoScores> | null | undefined,
    plagiarismSimilarity = 0,
): SeoScores {
    const readability = Number(raw?.readability ?? 0);
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
        readabilityGrade: raw?.readabilityGrade,
        aiDetection: raw?.aiDetection,
        aiDetectionPreKeywords: raw?.aiDetectionPreKeywords,
        aiDetectionError: raw?.aiDetectionError,
        humanizeSkippedReason: raw?.humanizeSkippedReason,
        humanizePassCount:
            typeof raw?.humanizePassCount === "number" && Number.isFinite(raw.humanizePassCount)
                ? raw.humanizePassCount
                : raw?.aiDetection?.attempts,
        humanizeDiagnostics: raw?.humanizeDiagnostics,
        keywordDensity: raw?.keywordDensity,
        keywordPlan: raw?.keywordPlan,
    };
}

export function seoQualityTotal(scores: SeoScores): number {
    return scores.readability + (100 - scores.aiContentPercent);
}
