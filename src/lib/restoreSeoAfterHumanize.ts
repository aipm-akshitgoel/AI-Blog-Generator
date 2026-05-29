import type { ContentConstraints } from "@/lib/types/contentSpec";
import type { KeywordPlan, KeywordTarget } from "@/lib/types/keywordPlan";
import {
    headingTitlesMatch,
    introBeforeFirstH2,
    keywordPlanDensityPercent,
    keywordPlanOccurrencesNeeded,
    parseH2Sections,
    parseH3Sections,
} from "@/lib/seoAnalyzer";

const DENSITY_TARGET_TOLERANCE = 0.3;
const MAX_EXTRA_OCCURRENCES_PER_KEYWORD = 30;

const KEYWORD_WEAVE_TEMPLATES: Array<(phrase: string) => string> = [
    (p) => `Many readers search for ${p}.`,
    (p) => `Students often compare ${p} before they enroll.`,
    (p) => `This section explains ${p} in practical terms.`,
    (p) => `You will also find ${p} discussed below.`,
    (p) => `A helpful starting point is ${p}.`,
    (p) => `The guide below covers ${p} step by step.`,
];

type InsertSite =
    | { kind: "intro" }
    | { kind: "h2-lead"; h2Idx: number }
    | { kind: "h3-body"; h2Idx: number; h3Idx: number };

type H3Block = { title: string; body: string };
type H2Block = { title: string; leadBody: string; h3s: H3Block[] };
type ArticleStructure = { intro: string; h2s: H2Block[] };

export type RestoreSeoAfterHumanizeOptions = {
    /** Markdown immediately before AI Humanize (after readability loop). */
    canonicalMarkdown: string;
    keywordPlan?: KeywordPlan | null;
    contentConstraints?: ContentConstraints | null;
    h2Suggestions?: string[];
};

function splitH2Body(h2Body: string): { leadBody: string; h3s: H3Block[] } {
    const body = String(h2Body || "");
    const h3s = parseH3Sections(body);
    if (h3s.length === 0) {
        return { leadBody: body.trim(), h3s: [] };
    }
    const idx = body.search(/^###\s+/m);
    const leadBody = idx >= 0 ? body.slice(0, idx).trim() : "";
    return { leadBody, h3s };
}

function parseArticleStructure(markdown: string): ArticleStructure {
    const intro = introBeforeFirstH2(markdown);
    const h2s = parseH2Sections(markdown).map((h2) => {
        const { leadBody, h3s } = splitH2Body(h2.body);
        return { title: h2.title, leadBody, h3s };
    });
    return { intro, h2s };
}

function renderArticleStructure(struct: ArticleStructure): string {
    const parts: string[] = [];
    if (struct.intro.trim()) parts.push(struct.intro.trim());
    for (const h2 of struct.h2s) {
        if (!h2.title.trim()) continue;
        parts.push(`## ${h2.title.trim()}`);
        if (h2.leadBody.trim()) parts.push(h2.leadBody.trim());
        for (const h3 of h2.h3s) {
            if (!h3.title.trim()) continue;
            parts.push(`### ${h3.title.trim()}`);
            if (h3.body.trim()) parts.push(h3.body.trim());
        }
    }
    return parts.join("\n\n").trim();
}

/** Replace ## / ### lines in order with headings from the canonical markdown. */
function restoreHeadingLinesInOrder(humanized: string, canonical: string): string {
    const canonicalHeadings: Array<{ level: 2 | 3; title: string }> = [];
    for (const line of String(canonical || "").split("\n")) {
        const h2 = line.match(/^##\s+(.+?)\s*$/);
        if (h2) {
            canonicalHeadings.push({ level: 2, title: h2[1].trim() });
            continue;
        }
        const h3 = line.match(/^###\s+(.+?)\s*$/);
        if (h3) canonicalHeadings.push({ level: 3, title: h3[1].trim() });
    }
    if (canonicalHeadings.length === 0) return humanized;

    let hi = 0;
    return String(humanized || "")
        .split("\n")
        .map((line) => {
            const h2 = line.match(/^##\s+/);
            const h3 = line.match(/^###\s+/);
            if ((h2 || h3) && hi < canonicalHeadings.length) {
                const next = canonicalHeadings[hi++];
                const prefix = next.level === 2 ? "##" : "###";
                return `${prefix} ${next.title}`;
            }
            return line;
        })
        .join("\n");
}

function lockedH2Titles(options: RestoreSeoAfterHumanizeOptions): string[] | undefined {
    const fromConstraints = options.contentConstraints?.h2Titles?.map((t) => t.trim()).filter(Boolean);
    if (fromConstraints?.length) return fromConstraints;
    const fromSuggestions = options.h2Suggestions?.map((t) => t.trim()).filter(Boolean);
    if (fromSuggestions?.length) return fromSuggestions;
    return undefined;
}

function lockedH3Titles(options: RestoreSeoAfterHumanizeOptions): string[] | undefined {
    const fromConstraints = options.contentConstraints?.h3Titles?.map((t) => t.trim()).filter(Boolean);
    if (fromConstraints?.length) return fromConstraints;
    return undefined;
}

function mergeArticleStructures(
    canonical: ArticleStructure,
    humanized: ArticleStructure,
    options: RestoreSeoAfterHumanizeOptions,
): ArticleStructure {
    const lockedH2 = lockedH2Titles(options);
    const lockedH3 = lockedH3Titles(options);

    const intro = humanized.intro.trim() || canonical.intro;
    const h2Count = Math.max(canonical.h2s.length, humanized.h2s.length, lockedH2?.length ?? 0);
    const h2s: H2Block[] = [];
    let globalH3Index = 0;

    for (let i = 0; i < h2Count; i++) {
        const c = canonical.h2s[i];
        const h = humanized.h2s[i];
        const title = lockedH2?.[i] || c?.title || h?.title || "";
        if (!title.trim()) continue;

        const h3Count = Math.max(c?.h3s.length ?? 0, h?.h3s.length ?? 0);
        const h3s: H3Block[] = [];
        for (let j = 0; j < h3Count; j++) {
            const ct = c?.h3s[j];
            const ht = h?.h3s[j];
            const h3Title = lockedH3?.[globalH3Index] || ct?.title || ht?.title || "";
            globalH3Index++;
            if (!h3Title.trim()) continue;
            const body = ht?.body?.trim() || ct?.body?.trim() || "";
            h3s.push({ title: h3Title, body });
        }

        const leadBody = h?.leadBody?.trim() || c?.leadBody?.trim() || "";
        h2s.push({ title, leadBody, h3s });
    }

    return { intro, h2s };
}

/** When humanize flattens structure, split body copy across the canonical outline. */
function distributeHumanizedAcrossCanonical(
    humanized: string,
    canonical: ArticleStructure,
    options: RestoreSeoAfterHumanizeOptions,
): ArticleStructure {
    const lockedH2 = lockedH2Titles(options);
    const lockedH3 = lockedH3Titles(options);
    const paras = introBeforeFirstH2(humanized)
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p && !/^#{1,6}\s/.test(p));

    const n = canonical.h2s.length;
    if (n === 0) {
        return { intro: paras.join("\n\n"), h2s: [] };
    }

    const introCount = Math.max(1, Math.min(3, Math.floor(paras.length * 0.2)));
    const intro = paras.slice(0, introCount).join("\n\n");
    const rest = paras.slice(introCount);
    const perSection = Math.max(1, Math.ceil(rest.length / n));
    let globalH3Index = 0;

    const h2s = canonical.h2s.map((c, i) => {
        const chunk = rest.slice(i * perSection, (i + 1) * perSection).join("\n\n");
        return {
            title: lockedH2?.[i] || c.title,
            leadBody: chunk,
            h3s: c.h3s.map((h3) => {
                const title = lockedH3?.[globalH3Index++] || h3.title;
                return { title, body: h3.body };
            }),
        };
    });

    return { intro, h2s };
}

/** Always appends a new sentence containing the phrase (used to raise weighted density). */
function appendPhraseToBlock(block: string, phrase: string, weaveIndex: number): string {
    if (!phrase.trim()) return block;
    const sentence = KEYWORD_WEAVE_TEMPLATES[weaveIndex % KEYWORD_WEAVE_TEMPLATES.length]!(phrase);
    const trimmed = block.trim();
    if (!trimmed) return sentence;

    const parts = trimmed.split(/\n\n+/);
    const paraIdx = weaveIndex % Math.max(1, parts.length);
    const para = (parts[paraIdx] ?? "").trim();
    parts[paraIdx] = `${para}${/[.!?]$/.test(para) ? "" : "."} ${sentence}`;
    return parts.join("\n\n");
}

function densityMeetsTarget(markdown: string, phrase: string, targetPercent: number): boolean {
    return keywordPlanDensityPercent(markdown, phrase) >= targetPercent - DENSITY_TARGET_TOLERANCE;
}

function listInsertSites(struct: ArticleStructure, target: KeywordTarget): InsertSite[] {
    if (target.tier === "primary" || !target.sectionTitle?.trim()) {
        const sites: InsertSite[] = [{ kind: "intro" }];
        struct.h2s.forEach((h2, h2Idx) => {
            sites.push({ kind: "h2-lead", h2Idx });
            h2.h3s.forEach((_, h3Idx) => sites.push({ kind: "h3-body", h2Idx, h3Idx }));
        });
        return sites.length > 1 ? sites : [{ kind: "intro" }];
    }

    const sectionTitle = target.sectionTitle.trim();
    const h2Idx = findH2Index(struct, sectionTitle);
    if (h2Idx < 0) {
        return struct.h2s.length > 0 ? [{ kind: "h2-lead", h2Idx: 0 }] : [{ kind: "intro" }];
    }

    const h2 = struct.h2s[h2Idx]!;
    const h3Idx = findH3InH2(h2, sectionTitle);
    if (h3Idx >= 0) {
        return [{ kind: "h3-body", h2Idx, h3Idx }];
    }
    const sites: InsertSite[] = [{ kind: "h2-lead", h2Idx }];
    h2.h3s.forEach((_, j) => sites.push({ kind: "h3-body", h2Idx, h3Idx: j }));
    return sites;
}

function applyInsertSite(
    struct: ArticleStructure,
    site: InsertSite,
    phrase: string,
    weaveIndex: number,
): ArticleStructure {
    const next = cloneStructure(struct);
    if (site.kind === "intro") {
        next.intro = appendPhraseToBlock(next.intro, phrase, weaveIndex);
        return next;
    }
    const h2 = next.h2s[site.h2Idx];
    if (!h2) return next;
    if (site.kind === "h2-lead") {
        h2.leadBody = appendPhraseToBlock(h2.leadBody, phrase, weaveIndex);
        return next;
    }
    const h3 = h2.h3s[site.h3Idx];
    if (h3) {
        h3.body = appendPhraseToBlock(h3.body, phrase, weaveIndex);
    }
    return next;
}

function findH2Index(struct: ArticleStructure, sectionTitle: string): number {
    for (let i = 0; i < struct.h2s.length; i++) {
        if (headingTitlesMatch(struct.h2s[i]!.title, sectionTitle)) return i;
    }
    return -1;
}

function findH3InH2(h2: H2Block, sectionTitle: string): number {
    for (let j = 0; j < h2.h3s.length; j++) {
        if (headingTitlesMatch(h2.h3s[j]!.title, sectionTitle)) return j;
    }
    return -1;
}

function cloneStructure(struct: ArticleStructure): ArticleStructure {
    return {
        intro: struct.intro,
        h2s: struct.h2s.map((h2) => ({
            ...h2,
            h3s: h2.h3s.map((h3) => ({ ...h3 })),
        })),
    };
}

/** Add keyword occurrences until each plan target is within tolerance (capped per phrase). */
export function meetKeywordPlanTargets(struct: ArticleStructure, plan: KeywordPlan): ArticleStructure {
    const targets: KeywordTarget[] = [plan.primary, ...plan.secondary, ...plan.tertiary];
    let out = struct;

    for (const target of targets) {
        const sites = () => listInsertSites(out, target);
        let added = 0;
        let markdown = renderArticleStructure(out);
        const needed = keywordPlanOccurrencesNeeded(
            markdown,
            target.phrase,
            target.targetDensityPercent,
        );
        const maxAdds = Math.min(
            MAX_EXTRA_OCCURRENCES_PER_KEYWORD,
            Math.max(needed, 1) + 2,
        );

        while (
            !densityMeetsTarget(markdown, target.phrase, target.targetDensityPercent) &&
            added < maxAdds
        ) {
            const siteList = sites();
            const site = siteList[added % siteList.length] ?? { kind: "intro" as const };
            const prev = markdown;
            out = applyInsertSite(out, site, target.phrase, added);
            added++;
            markdown = renderArticleStructure(out);
            if (markdown === prev) break;
        }
    }

    return out;
}

/** Boost keywordPlan phrases in finished markdown (e.g. final optimize pass). */
export function boostMarkdownForKeywordPlan(markdown: string, plan: KeywordPlan): string {
    const struct = parseArticleStructure(markdown);
    return renderArticleStructure(meetKeywordPlanTargets(struct, plan));
}

/**
 * After AI Humanize, restore locked/canonical ## / ### headings and re-insert keywordPlan phrases
 * that were removed during rewriting.
 */
export function restoreSeoAfterHumanize(
    humanizedMarkdown: string,
    options: RestoreSeoAfterHumanizeOptions,
): string {
    const canonical = String(options.canonicalMarkdown || "").trim();
    const humanized = String(humanizedMarkdown || "").trim();
    if (!canonical) return humanized;
    if (!humanized) return canonical;

    const canonicalStruct = parseArticleStructure(canonical);
    const humanizedStruct = parseArticleStructure(humanized);

    const lineRestored = restoreHeadingLinesInOrder(humanized, canonical);
    const humanizedAfterLines = parseArticleStructure(lineRestored);

    let merged: ArticleStructure;
    if (humanizedAfterLines.h2s.length > 0) {
        merged = mergeArticleStructures(canonicalStruct, humanizedAfterLines, options);
    } else if (canonicalStruct.h2s.length > 0) {
        merged = distributeHumanizedAcrossCanonical(lineRestored || humanized, canonicalStruct, options);
    } else {
        merged = humanizedAfterLines;
    }

    let markdown = renderArticleStructure(merged);
    if (options.keywordPlan) {
        const withKeywords = meetKeywordPlanTargets(parseArticleStructure(markdown), options.keywordPlan);
        markdown = renderArticleStructure(withKeywords);
    }

    return markdown.trim() || humanized;
}

/** Run heading restore + keyword boost on markdown (no humanize snapshot). */
export function applyKeywordPlanBoostToMarkdown(
    markdown: string,
    plan: KeywordPlan,
    options?: Pick<RestoreSeoAfterHumanizeOptions, "canonicalMarkdown" | "contentConstraints" | "h2Suggestions">,
): string {
    const canonical = options?.canonicalMarkdown?.trim() || markdown;
    const restored = restoreSeoAfterHumanize(markdown, {
        canonicalMarkdown: canonical,
        keywordPlan: null,
        contentConstraints: options?.contentConstraints,
        h2Suggestions: options?.h2Suggestions,
    });
    return boostMarkdownForKeywordPlan(restored, plan);
}
