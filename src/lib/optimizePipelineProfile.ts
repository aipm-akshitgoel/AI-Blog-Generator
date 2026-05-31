import { countMarkdownBodyWords } from "@/lib/contentWordCount";
import { OPTIMIZE_SERVER_MAX_DURATION_SEC } from "@/lib/optimizeContentClient";
import { POST_HUMANIZE_READABILITY_MAX_ATTEMPTS } from "@/lib/readabilityImprovement";
import { READABILITY_MAX_ATTEMPTS } from "@/lib/seoReviewToolsReadability";

/** Above this word count, use a shorter post-AI pipeline to finish within Vercel limits. */
export const LONG_POST_BODY_WORDS = 1_500;
/** Very long articles — measure readability only (no Azure rewrite loops). */
const VERY_LONG_POST_BODY_WORDS = 3_000;
/** Reserve time for final scoring + response serialization. */
const PIPELINE_BUFFER_MS = 25_000;
/** Skip readability loops when less than this remains after the Azure draft. */
const SKIP_POST_PIPELINE_REMAINING_MS = 50_000;

export type OptimizePipelineProfile = {
    bodyWords: number;
    /** Azure draft timeout (ms) for this request. */
    modelTimeoutMs: number;
    readabilityMaxAttempts: number;
    /** Azure readability edits after keyword placement (0 = measure only). */
    postKeywordReadabilityMax: number;
    skipExtraAiPolish: boolean;
    /** When true, skip readability loops after the Azure draft. */
    skipPostPipeline: boolean;
};

export function getOptimizePipelineProfile(
    markdown: string,
    requestStartedAtMs: number,
): OptimizePipelineProfile {
    const bodyWords = countMarkdownBodyWords(markdown);
    const elapsed = Date.now() - requestStartedAtMs;
    const remainingMs = OPTIMIZE_SERVER_MAX_DURATION_SEC * 1000 - elapsed - PIPELINE_BUFFER_MS;
    const veryLongPost = bodyWords > VERY_LONG_POST_BODY_WORDS;
    const longPost = bodyWords > LONG_POST_BODY_WORDS;
    const tightTime = remainingMs < SKIP_POST_PIPELINE_REMAINING_MS;

    const modelTimeoutMs =
        veryLongPost ? 75_000 : longPost ? 90_000 : tightTime ? 60_000 : 120_000;

    if (tightTime) {
        return {
            bodyWords,
            modelTimeoutMs: 60_000,
            readabilityMaxAttempts: 0,
            postKeywordReadabilityMax: 0,
            skipExtraAiPolish: true,
            skipPostPipeline: true,
        };
    }

    if (veryLongPost) {
        return {
            bodyWords,
            modelTimeoutMs,
            readabilityMaxAttempts: 0,
            postKeywordReadabilityMax: 0,
            skipExtraAiPolish: true,
            skipPostPipeline: false,
        };
    }

    if (longPost || remainingMs < 90_000) {
        return {
            bodyWords,
            modelTimeoutMs,
            readabilityMaxAttempts: 0,
            postKeywordReadabilityMax: 0,
            skipExtraAiPolish: true,
            skipPostPipeline: false,
        };
    }

    return {
        bodyWords,
        modelTimeoutMs,
        readabilityMaxAttempts: READABILITY_MAX_ATTEMPTS,
        postKeywordReadabilityMax: POST_HUMANIZE_READABILITY_MAX_ATTEMPTS,
        skipExtraAiPolish: true,
        skipPostPipeline: false,
    };
}
