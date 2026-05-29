import type { BlogPost } from "@/lib/types/content";
import type { ContentConstraints } from "@/lib/types/contentSpec";
import type {
    KeywordDensityVerification,
    KeywordDensityVerificationRow,
    KeywordPlan,
    KeywordTarget,
} from "@/lib/types/keywordPlan";
import {
    keywordPlanDensityPercent,
    parseH2Sections,
    parseH3Sections,
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
        .map((item) => normalizeTarget(item, "secondary"))
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

function sectionExistsInMarkdown(markdown: string, target: KeywordTarget): boolean {
    const title = target.sectionTitle?.trim();
    if (!title) return true;

    const want = title.toLowerCase();
    if (target.tier === "secondary") {
        return parseH2Sections(markdown).some((s) => s.title.toLowerCase() === want);
    }
    for (const h2 of parseH2Sections(markdown)) {
        if (parseH3Sections(h2.body).some((h3) => h3.title.toLowerCase() === want)) {
            return true;
        }
    }
    return false;
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

function measureTarget(markdown: string, target: KeywordTarget): KeywordDensityVerificationRow {
    return {
        tier: target.tier,
        label: labelForTarget(target),
        phrase: target.phrase,
        targetDensityPercent: target.targetDensityPercent,
        actualDensityPercent: keywordPlanDensityPercent(markdown, target.phrase),
        missing: !sectionExistsInMarkdown(markdown, target),
    };
}

/**
 * Verify keyword plan targets using local density (full article body, occurrence ÷ word count).
 */
export function verifyKeywordPlan(markdown: string, plan: KeywordPlan): KeywordDensityVerification {
    const rows: KeywordDensityVerificationRow[] = [
        measureTarget(markdown, plan.primary),
        ...plan.secondary.map((t) => measureTarget(markdown, t)),
        ...plan.tertiary.map((t) => measureTarget(markdown, t)),
    ];

    return { plan, rows };
}

export async function verifyKeywordPlanForPost(
    post: BlogPost,
    markdown: string,
    options?: { constraints?: ContentConstraints | null; strategyPrimary?: string },
): Promise<KeywordDensityVerification | null> {
    const plan = resolveKeywordPlan(post, options?.constraints, options?.strategyPrimary);
    if (!plan) return null;
    return verifyKeywordPlan(markdown, plan);
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
    }));
}

export function buildLocalKeywordPlanVerification(
    markdown: string,
    plan: KeywordPlan,
): KeywordDensityVerification {
    return verifyKeywordPlan(markdown, plan);
}

export function resolveKeywordPlanForPost(
    post: BlogPost,
    constraints?: ContentConstraints | null,
    strategyPrimary?: string,
): KeywordPlan | null {
    return resolveKeywordPlan(post, constraints, strategyPrimary);
}
