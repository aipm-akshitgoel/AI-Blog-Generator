/** Default target densities when SEO structure is used (override in brief UI). */
export const DEFAULT_H1_KEYWORD_DENSITY_PERCENT = 1.5;
export const DEFAULT_H2_KEYWORD_DENSITY_PERCENT = 1.0;
/** Minimum H3 subheadings under each H2 (### in markdown). */
export const DEFAULT_H3_PER_H2 = 2;

/**
 * How keyword density is calculated (analyzer + writer targets use the same rules).
 * See `keywordDensityPercent` in `@/lib/seoAnalyzer`.
 */
/** When comparisons, criteria, or side-by-side facts help the reader. */
export const MARKDOWN_TABLE_GUIDANCE = [
    "Use GitHub-flavored markdown tables when comparing options, fees, eligibility, pros/cons, or multi-column criteria.",
    "Format: header row, separator row (e.g. |---|---|), then data rows. Keep tables compact (3–5 columns max).",
    "Do not break table rows across paragraphs or insert blank lines inside a table.",
    "Do not place internal links inside table cells unless the brief requires it.",
] as const;

export const KEYWORD_DENSITY_COUNTING_RULES = [
    "Full article body: markdown H1 line excluded; link anchor text kept in plain text.",
    "Phrase match: case-insensitive; spaces in the keyword match flexible whitespace in the copy.",
    "Formula: (occurrences × phrase word count ÷ total words in the article body) × 100, one decimal.",
    "keywordPlan targets (primary / secondary / tertiary) are compared against this full-body density.",
] as const;

/** SEO structure targets set before draft generation. */
export interface ContentConstraints {
    wordCount?: number;
    h1Title?: string;
    h2Count?: number;
    /** Exact H2 headings in order (overrides h2Count when provided). */
    h2Titles?: string[];
    /** H3 subheadings required under each H2 (### in markdown). */
    h3PerH2?: number;
    /** North-star keyword from saved keyword strategy (domain level). */
    domainPrimaryKeyword?: string;
    /** Optional — target % for domainPrimaryKeyword in full article body (excl. FAQs). */
    domainKeywordDensityPercent?: number;
    /** Post-level primary keyword (H1 / this article) — mandatory per blog. */
    h1PrimaryKeyword?: string;
    /** Optional — secondary keywords (typically one per H2 when H2s are listed). */
    secondaryKeywords?: string[];
    /** Optional — tertiary keywords (typically one per H3 when H3s are listed). */
    tertiaryKeywords?: string[];
    /** Optional — exact H3 headings in order (overrides h3PerH2 when provided). */
    h3Titles?: string[];
    /** Required when structure is set — target % for h1PrimaryKeyword in the H1 intro span. */
    h1KeywordDensityPercent?: number;
    /** Required when structure is set — target % for h1PrimaryKeyword in each H2 section. */
    h2KeywordDensityPercent?: number;
    /** Optional — target % for h1PrimaryKeyword in each H3 block. */
    h3KeywordDensityPercent?: number;
}

/** Editor rules applied at the internal-linking / optimization step. */
export interface InterlinkingRules {
    instructions: string;
    minLinks?: number;
    maxLinks?: number;
}

export const EMPTY_INTERLINKING_RULES: InterlinkingRules = {
    instructions: "",
};

/** Per-blog mandatory fields: primary keyword + H1 title. */
export function hasMandatoryBlogStructure(c?: ContentConstraints | null): boolean {
    if (!c) return false;
    return !!(c.h1Title?.trim() && c.h1PrimaryKeyword?.trim());
}

export function hasH2Structure(c?: ContentConstraints | null): boolean {
    if (!c) return false;
    return !!((c.h2Titles && c.h2Titles.length > 0) || (c.h2Count != null && c.h2Count > 0));
}

/** True when H2 outline was set in the content directory / topic brief (optimizer must not reshape headings). */
export function isTocFinalized(c?: ContentConstraints | null): boolean {
    return !!(c?.h2Titles && c.h2Titles.length > 0);
}

export function buildTocLockedOptimizePrompt(c: ContentConstraints): string {
    const lines = [
        "### Table of contents — LOCKED",
        "The outline was finalized before optimization. You MUST NOT add, remove, rename, or reorder ## / ### headings.",
        "Only improve body paragraphs inside each existing section.",
    ];
    if (c.h2Titles?.length) {
        lines.push(
            `- Keep these H2 headings exactly (minor punctuation OK): ${c.h2Titles.map((t) => `"${t}"`).join(", ")}`,
        );
    }
    if (c.h3Titles?.length) {
        lines.push(
            `- Keep these H3 headings exactly: ${c.h3Titles.map((t) => `"${t}"`).join(", ")}`,
        );
    }
    return lines.join("\n");
}

export function hasH3Structure(c?: ContentConstraints | null): boolean {
    if (!c) return false;
    return !!((c.h3Titles && c.h3Titles.length > 0) || (c.h3PerH2 != null && c.h3PerH2 > 0));
}

export function parseKeywordList(text: string, max = 20): string[] {
    return text
        .split(/[\n,;|]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max);
}

export function hasContentConstraints(c?: ContentConstraints | null): boolean {
    if (!c) return false;
    return !!(
        (c.wordCount != null && c.wordCount > 0) ||
        c.h1Title?.trim() ||
        (c.h2Count != null && c.h2Count > 0) ||
        (c.h2Titles && c.h2Titles.length > 0) ||
        (c.h3Titles && c.h3Titles.length > 0) ||
        (c.secondaryKeywords && c.secondaryKeywords.length > 0) ||
        (c.tertiaryKeywords && c.tertiaryKeywords.length > 0) ||
        c.domainPrimaryKeyword?.trim() ||
        c.h1PrimaryKeyword?.trim() ||
        (c.domainKeywordDensityPercent != null && c.domainKeywordDensityPercent > 0) ||
        (c.h1KeywordDensityPercent != null && c.h1KeywordDensityPercent > 0) ||
        (c.h2KeywordDensityPercent != null && c.h2KeywordDensityPercent > 0) ||
        (c.h3KeywordDensityPercent != null && c.h3KeywordDensityPercent > 0) ||
        (c.h3PerH2 != null && c.h3PerH2 > 0)
    );
}

export function usesSeoStructure(c?: ContentConstraints | null): boolean {
    if (!c) return false;
    return hasMandatoryBlogStructure(c) || hasH2Structure(c) || hasH3Structure(c);
}

/** Apply H3-per-H2 default when H2 structure is used (densities come from writer keywordPlan). */
export function applyContentConstraintDefaults(c: ContentConstraints): ContentConstraints {
    const out = { ...c };
    if (hasH2Structure(out) && !out.h3Titles?.length && (out.h3PerH2 == null || out.h3PerH2 <= 0)) {
        out.h3PerH2 = DEFAULT_H3_PER_H2;
    }
    return out;
}

function densityPromptLines(keyword: string, percent: number, scope: string): string {
    return `- Target ~${percent}% density for "${keyword}" in ${scope} (keyword-words ÷ span-words × 100, phrase match case-insensitive).`;
}

export function hasInterlinkingRules(r?: InterlinkingRules | null): boolean {
    if (!r) return false;
    return !!(
        r.instructions?.trim() ||
        (r.minLinks != null && r.minLinks > 0) ||
        (r.maxLinks != null && r.maxLinks > 0)
    );
}

export function buildContentConstraintsPrompt(c: ContentConstraints): string {
    const lines: string[] = [
        "### Content structure requirements",
        "",
        "#### Mandatory (every blog)",
    ];

    if (c.h1PrimaryKeyword?.trim()) {
        const h1Kw = c.h1PrimaryKeyword.trim();
        lines.push(
            `- Primary keyword hint: "${h1Kw}" — MUST appear in the H1; you will finalize exact density targets in keywordPlan.`,
        );
    }
    if (c.h1Title?.trim()) {
        lines.push(`- H1 title (h1Title) MUST be: "${c.h1Title.trim()}"`);
    }

    const optionalLines: string[] = [];

    if (c.wordCount != null && c.wordCount > 0) {
        const minWords = Math.round(c.wordCount * 0.95);
        optionalLines.push(
            `- contentMarkdown body (exclude FAQs) MUST be at least ${minWords} words and target ${c.wordCount} words (acceptable range ${minWords}–${Math.round(c.wordCount * 1.05)}).`,
        );
    }
    if (c.h2Titles && c.h2Titles.length > 0) {
        optionalLines.push(
            `- Use exactly these H2 headings in contentMarkdown in this order (minor grammar tweaks OK): ${c.h2Titles.map((t) => `"${t}"`).join(", ")}`,
        );
        optionalLines.push(`- h2Suggestions array MUST list the same ${c.h2Titles.length} headings.`);
    } else if (c.h2Count != null && c.h2Count > 0) {
        optionalLines.push(
            `- Use exactly ${c.h2Count} H2 sections in contentMarkdown; h2Suggestions must have ${c.h2Count} entries.`,
        );
    }

    if (c.h3Titles && c.h3Titles.length > 0) {
        optionalLines.push(
            `- Use these H3 headings (### in markdown) where they fit under the related H2 sections: ${c.h3Titles.map((t) => `"${t}"`).join(", ")}`,
        );
    } else if (hasH2Structure(c) && c.h3PerH2 != null && c.h3PerH2 > 0) {
        optionalLines.push(
            `- Under each ## H2 section include at least ${Math.round(c.h3PerH2)} H3 subheadings (### in markdown) before the next H2.`,
        );
    }

    if (c.secondaryKeywords && c.secondaryKeywords.length > 0) {
        optionalLines.push(
            `- Secondary keywords (use in matching H2 sections when H2s are listed, otherwise distribute naturally): ${c.secondaryKeywords.map((k) => `"${k}"`).join(", ")}`,
        );
    }
    if (c.tertiaryKeywords && c.tertiaryKeywords.length > 0) {
        optionalLines.push(
            `- Tertiary keywords (use in H3 subsections when H3s are listed, otherwise distribute naturally): ${c.tertiaryKeywords.map((k) => `"${k}"`).join(", ")}`,
        );
    }

    if (c.domainPrimaryKeyword?.trim()) {
        const domainKw = c.domainPrimaryKeyword.trim();
        lines.push(
            `- Domain-level primary keyword (from strategy): "${domainKw}" — weave naturally where relevant.`,
        );
        if (c.domainKeywordDensityPercent != null && c.domainKeywordDensityPercent > 0) {
            lines.push(
                densityPromptLines(
                    domainKw,
                    c.domainKeywordDensityPercent,
                    "the full article body (excluding the FAQ section)",
                ),
            );
        }
    }
    if (optionalLines.length > 0) {
        lines.push("", "#### Optional (when provided)", ...optionalLines);
    }

    lines.push("", "### Keyword density counting (analyzer uses the same rules)", ...KEYWORD_DENSITY_COUNTING_RULES.map((r) => `- ${r}`));
    lines.push("", "### Tables (when useful)", ...MARKDOWN_TABLE_GUIDANCE.map((r) => `- ${r}`));

    return lines.join("\n");
}

export function buildInterlinkingRulesPrompt(r: InterlinkingRules): string {
    const parts: string[] = [];
    if (r.instructions?.trim()) {
        parts.push(`Internal linking instructions (MUST follow):\n${r.instructions.trim()}`);
    }

    const min = r.minLinks != null && r.minLinks > 0 ? Math.round(r.minLinks) : 0;
    const max = r.maxLinks != null && r.maxLinks > 0 ? Math.round(r.maxLinks) : 0;

    if (min > 0 && max > 0) {
        parts.push(
            `Place between ${min} and ${max} internal hyperlinks in contentMarkdown (markdown [anchor](/path) syntax only).`,
        );
    } else if (min > 0) {
        parts.push(`Place at least ${min} internal hyperlinks in contentMarkdown.`);
    } else if (max > 0) {
        parts.push(`Place at most ${max} internal hyperlinks in contentMarkdown.`);
    }

    if (min > 0 || max > 0 || r.instructions?.trim()) {
        parts.push(
            "Use only on-site hrefs from the approved internal list (relative paths or same domain). Do not add external/outbound URLs. Count every [anchor](url) in the body toward the min/max.",
            "Link only when the sentence clearly discusses that specific target page (institution, program, or topic named in the URL). Never link generic words that mean something else in context (e.g. accreditation 'infrastructure' ≠ an MBA infrastructure course page unless that program is named in the same paragraph).",
        );
    }

    return parts.join("\n");
}

function clampDensityPercent(n: number): number {
    return Math.min(10, Math.max(0.1, n));
}

/** Strip empty fields before sending to API. Applies mandatory H1/H2 density defaults when structure is set. */
export function normalizeContentConstraints(c: ContentConstraints): ContentConstraints | undefined {
    let working = applyContentConstraintDefaults({ ...c });
    const out: ContentConstraints = {};
    if (working.wordCount != null && working.wordCount > 0) out.wordCount = Math.round(working.wordCount);
    if (working.h1Title?.trim()) out.h1Title = working.h1Title.trim();
    if (working.h2Count != null && working.h2Count > 0) out.h2Count = Math.min(12, Math.round(working.h2Count));
    if (working.h2Titles?.length) {
        out.h2Titles = working.h2Titles.map((t) => t.trim()).filter(Boolean).slice(0, 12);
    }
    if (working.h3Titles?.length) {
        out.h3Titles = working.h3Titles.map((t) => t.trim()).filter(Boolean).slice(0, 24);
    }
    if (working.h3PerH2 != null && working.h3PerH2 > 0) {
        out.h3PerH2 = Math.min(8, Math.round(working.h3PerH2));
    }
    if (working.secondaryKeywords?.length) {
        out.secondaryKeywords = working.secondaryKeywords.map((k) => k.trim()).filter(Boolean).slice(0, 20);
    }
    if (working.tertiaryKeywords?.length) {
        out.tertiaryKeywords = working.tertiaryKeywords.map((k) => k.trim()).filter(Boolean).slice(0, 24);
    }
    if (working.domainPrimaryKeyword?.trim()) out.domainPrimaryKeyword = working.domainPrimaryKeyword.trim();
    if (working.domainKeywordDensityPercent != null && working.domainKeywordDensityPercent > 0) {
        out.domainKeywordDensityPercent = clampDensityPercent(working.domainKeywordDensityPercent);
    }
    if (working.h1PrimaryKeyword?.trim()) out.h1PrimaryKeyword = working.h1PrimaryKeyword.trim();
    if (hasH2Structure(working) && !out.h3Titles?.length && (out.h3PerH2 == null || out.h3PerH2 <= 0)) {
        out.h3PerH2 = DEFAULT_H3_PER_H2;
    }
    if (working.h1KeywordDensityPercent != null && working.h1KeywordDensityPercent > 0) {
        out.h1KeywordDensityPercent = clampDensityPercent(working.h1KeywordDensityPercent);
    }
    if (working.h2KeywordDensityPercent != null && working.h2KeywordDensityPercent > 0) {
        out.h2KeywordDensityPercent = clampDensityPercent(working.h2KeywordDensityPercent);
    }
    if (working.h3KeywordDensityPercent != null && working.h3KeywordDensityPercent > 0) {
        out.h3KeywordDensityPercent = clampDensityPercent(working.h3KeywordDensityPercent);
    }
    return hasContentConstraints(out) ? out : undefined;
}

export function normalizeInterlinkingRules(r: InterlinkingRules): InterlinkingRules {
    return {
        instructions: r.instructions?.trim() ?? "",
        minLinks: r.minLinks != null && r.minLinks > 0 ? Math.round(r.minLinks) : undefined,
        maxLinks: r.maxLinks != null && r.maxLinks > 0 ? Math.round(r.maxLinks) : undefined,
    };
}
