import { fleschEaseToReadabilityPercent } from "@/lib/seoReviewToolsReadability";
import type { BlogPost } from "@/lib/types/content";
import type { ContentConstraints } from "@/lib/types/contentSpec";
import type { SeoScores } from "@/lib/types/optimization";
import type { KeywordDensityVerification } from "@/lib/types/keywordPlan";

type ReadabilityApiResponse = {
    gradeLevel: number;
    gradeLabel: string;
    fleschScore: number;
    fleschLabel?: string;
    targetMet?: boolean;
    targetGradeMax?: number;
    error?: string;
};

export type RefreshOptimizerMetricsOptions = {
    post?: BlogPost;
    constraints?: ContentConstraints | null;
    strategyPrimary?: string;
    readabilityTargetGradeMax?: number;
};

/** Re-verify readability (SEO Review Tools) and keyword density for the current draft. */
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

    const [readRes, densityRes] = await Promise.all([
        fetch("/api/readability-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                markdown,
                readabilityTargetGradeMax: options?.readabilityTargetGradeMax,
            }),
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

    if (densityRes?.ok) {
        const data = (await densityRes.json()) as KeywordDensityVerification & { error?: string };
        if (!data.error && data.rows?.length) {
            next.keywordDensity = data;
            next.keywordPlan = data.plan;
        }
    }

    return next;
}
