import { fleschEaseToReadabilityPercent } from "@/lib/seoReviewToolsReadability";
import type { BlogPost } from "@/lib/types/content";
import type { ContentConstraints } from "@/lib/types/contentSpec";
import type { SeoScores } from "@/lib/types/optimization";
import type { KeywordDensityVerification } from "@/lib/types/keywordPlan";
import { applyZeroGptDetectionToScores } from "@/lib/zerogptAiDetection";

type ReadabilityApiResponse = {
    gradeLevel: number;
    gradeLabel: string;
    fleschScore: number;
    fleschLabel?: string;
    targetMet?: boolean;
    targetGradeMax?: number;
    error?: string;
};

type AiDetectionApiResponse = {
    aiPercent: number;
    humanPercent: number;
    targetMet: boolean;
    confidence?: string;
    error?: string;
};

export type RefreshOptimizerMetricsOptions = {
    post?: BlogPost;
    constraints?: ContentConstraints | null;
    strategyPrimary?: string;
    readabilityTargetGradeMax?: number;
};

/** Re-verify readability (SEO Review Tools), AI % (ZeroGPT), and keyword density for the current draft. */
export async function refreshOptimizerMetrics(
    markdown: string,
    base: SeoScores,
    options?: RefreshOptimizerMetricsOptions,
): Promise<SeoScores> {
    let next: SeoScores = { ...base };

    const densityPromise =
        options?.post
            ? fetch("/api/keyword-density", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      markdown,
                      post: options.post,
                      constraints: options.constraints ?? null,
                      strategyPrimary: options.strategyPrimary,
                  }),
              }).catch(() => null)
            : Promise.resolve(null);

    const [readRes, aiRes, densityRes] = await Promise.all([
        fetch("/api/readability-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                markdown,
                readabilityTargetGradeMax: options?.readabilityTargetGradeMax,
            }),
        }).catch(() => null),
        fetch("/api/ai-detection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markdown }),
        }).catch(() => null),
        densityPromise,
    ]);

    if (readRes?.ok) {
        const data = (await readRes.json()) as ReadabilityApiResponse;
        if (!data.error && typeof data.fleschScore === "number") {
            next.readability = fleschEaseToReadabilityPercent(data.fleschScore);
            next.readabilityGrade = {
                gradeLevel: data.gradeLevel,
                gradeLabel: data.gradeLabel,
                fleschScore: data.fleschScore,
                fleschLabel: data.fleschLabel,
                targetMet: Boolean(data.targetMet),
                targetGradeMax: data.targetGradeMax ?? options?.readabilityTargetGradeMax,
                attempts: base.readabilityGrade?.attempts ?? 0,
                provider: "seo-review-tools",
                isFinal: base.readabilityGrade?.isFinal,
            };
        }
    }

    if (aiRes?.ok) {
        const data = (await aiRes.json()) as AiDetectionApiResponse;
        if (!data.error && typeof data.aiPercent === "number") {
            next = applyZeroGptDetectionToScores(next, {
                aiPercent: data.aiPercent,
                humanPercent: data.humanPercent,
                targetMet: data.targetMet,
                confidence: data.confidence,
            }, next.aiDetection?.attempts ?? next.humanizePassCount ?? 0);
            if (next.humanizePassCount != null) {
                next.humanizePassCount = Math.max(
                    next.humanizePassCount,
                    next.aiDetection?.attempts ?? 0,
                );
            }
            delete next.aiDetectionError;
        } else if (data.error) {
            next = { ...next, aiDetectionError: data.error };
        }
    } else if (aiRes) {
        const data = (await aiRes.json().catch(() => ({}))) as AiDetectionApiResponse;
        if (data.error) {
            next = { ...next, aiDetectionError: data.error };
        }
    }

    if (densityRes?.ok) {
        const data = (await densityRes.json()) as KeywordDensityVerification & { error?: string };
        if (!data.error && data.rows?.length) {
            next.keywordDensity = data;
            next.keywordPlan = data.plan;
        }
    }

    return next;
}
