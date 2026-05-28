import type { BlogPost } from "@/lib/types/content";
import type { ContentConstraints } from "@/lib/types/contentSpec";
import type {
    KeywordDensityVerification,
    KeywordDensityVerificationRow,
    KeywordPlan,
    KeywordTarget,
} from "@/lib/types/keywordPlan";
import {
    buildContentAnalysisHtml,
    fetchSeoReviewToolsKeywordDensity,
} from "@/lib/seoReviewToolsContentAnalysis";
import { getSeoReviewToolsApiKey } from "@/lib/seoReviewToolsReadability";
import { keywordDensityPercent } from "@/lib/seoAnalyzer";
import {
    introBeforeFirstH2,
    parseH2Sections,
    parseH3Sections,
    plainTextFromMarkdown,
} from "@/lib/seoAnalyzer";

function clampDensity(n: number): number {
    return Math.min(10, Math.max(0.1, Math.round(n * 10) / 10));
}

function normalizeTarget(raw: unknown, tier: KeywordTarget["tier"], sectionTitle?: string): KeywordTarget | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const phrase = String(o.phrase ?? o.keyword ?? "").trim();
    const target = Number(o.targetDensityPercent ?? o.targetPercent ?? o.density);
    if (!phrase || !Number.isFinite(target) || target <= 0) return null;
    return {
        phrase,
        targetDensityPercent: clampDensity(target),
        tier,
        sectionTitle: sectionTitle?.trim() || String(o.sectionTitle ?? o.h2Title ?? o.h3Title ?? "").trim() || undefined,
    };
}

export function normalizeKeywordPlanFromModel(raw: unknown): KeywordPlan | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;

    const primary =
        normalizeTarget(o.primary, "primary") ??
        (o.primaryKeyword
            ? normalizeTarget(
                  { phrase: o.primaryKeyword, targetDensityPercent: o.primaryKeywordTargetDensityPercent },
                  "primary",
              )
            : null);
    if (!primary) return null;

    const secondaryRaw = Array.isArray(o.secondary) ? o.secondary : Array.isArray(o.secondaryKeywords) ? o.secondaryKeywords : [];
    const tertiaryRaw = Array.isArray(o.tertiary) ? o.tertiary : Array.isArray(o.tertiaryKeywords) ? o.tertiaryKeywords : [];

    const secondary = secondaryRaw
        .map((item, i) => normalizeTarget(item, "secondary", undefined) ?? null)
        .filter((t): t is KeywordTarget => Boolean(t))
        .slice(0, 12);

    const tertiary = tertiaryRaw
        .map((item) => normalizeTarget(item, "tertiary"))
        .filter((t): t is KeywordTarget => Boolean(t))
        .slice(0, 16);

    return { primary, secondary, tertiary };
}

/** Build a plan from brief hints when the model omitted keywordPlan. */
export function inferKeywordPlanFromBrief(
    post: Pick<BlogPost, "h1Title" | "title" | "h2Suggestions">,
    constraints?: ContentConstraints | null,
    strategyPrimary?: string,
): KeywordPlan | null {
    const primaryPhrase =
        constraints?.h1PrimaryKeyword?.trim() || strategyPrimary?.trim() || "";
    if (!primaryPhrase) return null;

    const primary: KeywordTarget = {
        phrase: primaryPhrase,
        targetDensityPercent: 1.5,
        tier: "primary",
    };

    const h2s =
        constraints?.h2Titles?.length
            ? constraints.h2Titles
            : (post.h2Suggestions ?? []).filter(Boolean);
    const secondaryPhrases = constraints?.secondaryKeywords ?? [];
    const tertiaryPhrases = constraints?.tertiaryKeywords ?? [];
    const h3Titles = constraints?.h3Titles ?? [];

    const secondary: KeywordTarget[] = secondaryPhrases.map((phrase, i) => ({
        phrase: phrase.trim(),
        targetDensityPercent: 1.0,
        tier: "secondary" as const,
        sectionTitle: h2s[i]?.trim() || undefined,
    }));

    const tertiary: KeywordTarget[] = tertiaryPhrases.map((phrase, i) => ({
        phrase: phrase.trim(),
        targetDensityPercent: 0.8,
        tier: "tertiary" as const,
        sectionTitle: h3Titles[i]?.trim() || undefined,
    }));

    return { primary, secondary, tertiary };
}

function resolveKeywordPlan(
    post: BlogPost,
    constraints?: ContentConstraints | null,
    strategyPrimary?: string,
): KeywordPlan | null {
    return post.keywordPlan ?? inferKeywordPlanFromBrief(post, constraints, strategyPrimary);
}

function sectionMarkdownForTarget(markdown: string, target: KeywordTarget): string {
    if (target.tier === "primary") {
        const intro = introBeforeFirstH2(markdown);
        return intro.trim() ? intro : markdown;
    }
    if (!target.sectionTitle?.trim()) {
        return markdown;
    }

    const sections = parseH2Sections(markdown);
    if (target.tier === "secondary") {
        const match = sections.find(
            (s) => s.title.toLowerCase() === target.sectionTitle!.toLowerCase(),
        );
        return match?.body?.trim() ? `## ${match.title}\n\n${match.body}` : markdown;
    }

    for (const h2 of sections) {
        for (const h3 of parseH3Sections(h2.body)) {
            if (h3.title.toLowerCase() === target.sectionTitle!.toLowerCase()) {
                return `### ${h3.title}\n\n${h3.body}`;
            }
        }
    }
    return markdown;
}

function localDensityForTarget(markdown: string, target: KeywordTarget): number {
    if (target.tier === "primary") {
        const intro = introBeforeFirstH2(markdown);
        const span = intro ? plainTextFromMarkdown(intro) : plainTextFromMarkdown(markdown);
        return keywordDensityPercent(span, target.phrase);
    }
    const sectionMd = sectionMarkdownForTarget(markdown, target);
    const plain = plainTextFromMarkdown(sectionMd.replace(/^#+\s+[^\n]+\n?/gm, ""));
    return keywordDensityPercent(plain, target.phrase);
}

function labelForTarget(target: KeywordTarget): string {
    if (target.tier === "primary") return "Primary keyword";
    if (target.tier === "secondary") {
        return target.sectionTitle?.trim()
            ? `Secondary keyword · ${target.sectionTitle.trim()}`
            : "Secondary keyword";
    }
    return target.sectionTitle?.trim()
        ? `Tertiary keyword · ${target.sectionTitle.trim()}`
        : "Tertiary keyword";
}

async function measureTarget(
    markdown: string,
    target: KeywordTarget,
    htmlContext: { title: string; h1Title: string; metaDescription: string },
    apiKey: string | null,
): Promise<KeywordDensityVerificationRow> {
    const label = labelForTarget(target);
    const sectionMd = sectionMarkdownForTarget(markdown, target);

    if (apiKey) {
        const html = buildContentAnalysisHtml({
            ...htmlContext,
            bodyMarkdown: sectionMd,
        });
        const related =
            target.tier === "primary"
                ? []
                : [];
        const result = await fetchSeoReviewToolsKeywordDensity(html, target.phrase, {
            apiKey,
            relatedKeywords: related,
        });
        if (result) {
            return {
                tier: target.tier,
                label,
                phrase: target.phrase,
                targetDensityPercent: target.targetDensityPercent,
                actualDensityPercent: result.densityPercent,
                frequency: result.frequency,
                provider: "seo-review-tools",
            };
        }
    }

    return {
        tier: target.tier,
        label,
        phrase: target.phrase,
        targetDensityPercent: target.targetDensityPercent,
        actualDensityPercent: localDensityForTarget(markdown, target),
        provider: "local",
        missing: target.sectionTitle ? !sectionMd.includes(target.sectionTitle) : false,
    };
}

/**
 * Verify writer-finalized keyword targets using SEO Review Tools (fallback: local counter).
 */
export async function verifyKeywordPlan(
    markdown: string,
    plan: KeywordPlan,
    htmlContext: { title: string; h1Title: string; metaDescription: string },
): Promise<KeywordDensityVerification> {
    const apiKey = getSeoReviewToolsApiKey();
    const rows: KeywordDensityVerificationRow[] = [];

    rows.push(await measureTarget(markdown, plan.primary, htmlContext, apiKey));

    for (const sec of plan.secondary) {
        rows.push(await measureTarget(markdown, sec, htmlContext, apiKey));
    }
    for (const ter of plan.tertiary) {
        rows.push(await measureTarget(markdown, ter, htmlContext, apiKey));
    }

    const apiCount = rows.filter((r) => r.provider === "seo-review-tools").length;
    const provider: KeywordDensityVerification["provider"] =
        apiCount === 0 ? "local" : apiCount === rows.length ? "seo-review-tools" : "mixed";

    return {
        plan,
        rows,
        provider,
        skippedReason: apiKey
            ? provider === "local"
                ? "SEO Review Tools API did not return density for one or more keywords — local counter used"
                : undefined
            : "SEO_REVIEW_TOOLS_API_KEY not set — measured with local counter",
    };
}

export async function verifyKeywordPlanForPost(
    post: BlogPost,
    markdown: string,
    options?: { constraints?: ContentConstraints | null; strategyPrimary?: string },
): Promise<KeywordDensityVerification | null> {
    const plan = resolveKeywordPlan(post, options?.constraints, options?.strategyPrimary);
    if (!plan) return null;

    return verifyKeywordPlan(markdown, plan, {
        title: post.title,
        h1Title: post.h1Title || post.title,
        metaDescription: post.metaDescription,
    });
}

export function keywordVerificationToDensityRows(
    verification: KeywordDensityVerification | null | undefined,
): import("@/lib/seoAnalyzer").KeywordDensityRow[] {
    if (!verification?.rows?.length) return [];
    return verification.rows.map((r) => ({
        level: r.tier,
        label: r.label,
        keyword: r.phrase,
        densityPercent: r.actualDensityPercent,
        targetPercent: r.targetDensityPercent,
        missing: r.missing,
        provider: r.provider,
    }));
}

/** Local-only density rows (one per keyword in the plan, not per heading). */
export function buildLocalKeywordPlanVerification(
    markdown: string,
    plan: KeywordPlan,
    htmlContext: { title: string; h1Title: string; metaDescription: string },
): KeywordDensityVerification {
    const rows: KeywordDensityVerificationRow[] = [
        plan.primary,
        ...plan.secondary,
        ...plan.tertiary,
    ].map((target) => ({
        tier: target.tier,
        label: labelForTarget(target),
        phrase: target.phrase,
        targetDensityPercent: target.targetDensityPercent,
        actualDensityPercent: localDensityForTarget(markdown, target),
        provider: "local" as const,
        missing:
            target.sectionTitle != null &&
            target.sectionTitle.trim() !== "" &&
            !sectionMarkdownForTarget(markdown, target).includes(target.sectionTitle),
    }));

    return {
        plan,
        rows,
        provider: "local",
        skippedReason: getSeoReviewToolsApiKey()
            ? undefined
            : "SEO_REVIEW_TOOLS_API_KEY not set — measured with local counter",
    };
}

export function resolveKeywordPlanForPost(
    post: BlogPost,
    constraints?: ContentConstraints | null,
    strategyPrimary?: string,
): KeywordPlan | null {
    return resolveKeywordPlan(post, constraints, strategyPrimary);
}

export function keywordDensitySourceLabel(
    verification: KeywordDensityVerification | null | undefined,
): string {
    if (!verification) return "No keyword plan on this draft";
    if (verification.skippedReason) return verification.skippedReason;
    switch (verification.provider) {
        case "seo-review-tools":
            return "Actual % from SEO Review Tools content analysis API";
        case "local":
            return "Local counter only (SEO Review Tools API unavailable)";
        case "mixed":
            return "Mixed: some rows from SEO Review Tools API, others from local counter";
        default:
            return "";
    }
}
