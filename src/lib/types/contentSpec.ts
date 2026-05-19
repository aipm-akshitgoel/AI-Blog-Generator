/** SEO structure targets set before draft generation. */
export interface ContentConstraints {
    wordCount?: number;
    h1Title?: string;
    h2Count?: number;
    /** Exact H2 headings in order (overrides h2Count when provided). */
    h2Titles?: string[];
    h1PrimaryKeyword?: string;
    /** Target % of body words that are the primary keyword (e.g. 1.5). */
    h1KeywordDensityPercent?: number;
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

export function hasContentConstraints(c?: ContentConstraints | null): boolean {
    if (!c) return false;
    return !!(
        (c.wordCount != null && c.wordCount > 0) ||
        c.h1Title?.trim() ||
        (c.h2Count != null && c.h2Count > 0) ||
        (c.h2Titles && c.h2Titles.length > 0) ||
        c.h1PrimaryKeyword?.trim() ||
        (c.h1KeywordDensityPercent != null && c.h1KeywordDensityPercent > 0)
    );
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
        "### Content structure requirements (MUST follow — non-negotiable)",
    ];

    if (c.wordCount != null && c.wordCount > 0) {
        const minWords = Math.round(c.wordCount * 0.95);
        lines.push(
            `- contentMarkdown body (exclude FAQs) MUST be at least ${minWords} words and target ${c.wordCount} words (acceptable range ${minWords}–${Math.round(c.wordCount * 1.05)}). Shorter drafts are not acceptable.`,
        );
        lines.push(
            `- Add depth under each H2 (examples, criteria, numbers, comparisons) until the word-count target is met.`,
        );
    }
    if (c.h1Title?.trim()) {
        lines.push(`- h1Title MUST be: "${c.h1Title.trim()}"`);
    }
    if (c.h2Titles && c.h2Titles.length > 0) {
        lines.push(
            `- Use exactly these H2 headings in contentMarkdown in this order (minor grammar tweaks OK): ${c.h2Titles.map((t) => `"${t}"`).join(", ")}`,
        );
        lines.push(`- h2Suggestions array MUST list the same ${c.h2Titles.length} headings.`);
    } else if (c.h2Count != null && c.h2Count > 0) {
        lines.push(
            `- Use exactly ${c.h2Count} H2 sections in contentMarkdown; h2Suggestions must have ${c.h2Count} entries.`,
        );
    }
    if (c.h1PrimaryKeyword?.trim()) {
        const kw = c.h1PrimaryKeyword.trim();
        lines.push(`- Primary SEO keyword: "${kw}" — include it in h1Title and weave naturally through the body.`);
        if (c.h1KeywordDensityPercent != null && c.h1KeywordDensityPercent > 0) {
            lines.push(
                `- Target keyword density for "${kw}" in contentMarkdown body: ~${c.h1KeywordDensityPercent}% of total body words (count occurrences ÷ word count × 100).`,
            );
        }
    } else if (c.h1KeywordDensityPercent != null && c.h1KeywordDensityPercent > 0) {
        lines.push(
            `- Target primary-keyword density in body: ~${c.h1KeywordDensityPercent}% of total body words.`,
        );
    }

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

/** Strip empty fields before sending to API. */
export function normalizeContentConstraints(c: ContentConstraints): ContentConstraints | undefined {
    const out: ContentConstraints = {};
    if (c.wordCount != null && c.wordCount > 0) out.wordCount = Math.round(c.wordCount);
    if (c.h1Title?.trim()) out.h1Title = c.h1Title.trim();
    if (c.h2Count != null && c.h2Count > 0) out.h2Count = Math.min(12, Math.round(c.h2Count));
    if (c.h2Titles?.length) {
        out.h2Titles = c.h2Titles.map((t) => t.trim()).filter(Boolean).slice(0, 12);
    }
    if (c.h1PrimaryKeyword?.trim()) out.h1PrimaryKeyword = c.h1PrimaryKeyword.trim();
    if (c.h1KeywordDensityPercent != null && c.h1KeywordDensityPercent > 0) {
        out.h1KeywordDensityPercent = Math.min(10, Math.max(0.1, c.h1KeywordDensityPercent));
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
