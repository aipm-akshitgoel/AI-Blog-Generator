import { countMarkdownBodyWords } from "@/lib/contentWordCount";
import { OPTIMIZE_SERVER_MAX_DURATION_SEC } from "@/lib/optimizeContentClient";
import { POST_HUMANIZE_READABILITY_MAX_ATTEMPTS } from "@/lib/readabilityImprovement";
import { READABILITY_MAX_ATTEMPTS } from "@/lib/seoReviewToolsReadability";

/** Above this word count, use a shorter post-AI pipeline to finish within Vercel limits. */
const LONG_POST_BODY_WORDS = 2_000;
/** Reserve time for final scoring + response serialization. */
const PIPELINE_BUFFER_MS = 22_000;

export type OptimizePipelineProfile = {
    bodyWords: number;
    readabilityMaxAttempts: number;
    humanizePass1Max: number;
    /** 0 = skip second humanize loop */
    humanizePass2Max: number;
    /** 0 = skip post-humanize readability edits (still measure at end) */
    postHumanizeReadabilityMax: number;
    skipExtraAiPolish: boolean;
};

export function getOptimizePipelineProfile(
    markdown: string,
    pipelineStartedAtMs: number,
): OptimizePipelineProfile {
    const bodyWords = countMarkdownBodyWords(markdown);
    const elapsed = Date.now() - pipelineStartedAtMs;
    const remainingMs = OPTIMIZE_SERVER_MAX_DURATION_SEC * 1000 - elapsed - PIPELINE_BUFFER_MS;
    const longPost = bodyWords > LONG_POST_BODY_WORDS;
    const tightTime = remainingMs < 75_000;

    if (longPost || tightTime) {
        return {
            bodyWords,
            readabilityMaxAttempts: 1,
            humanizePass1Max: 1,
            humanizePass2Max: tightTime ? 0 : 2,
            postHumanizeReadabilityMax: tightTime ? 0 : 1,
            skipExtraAiPolish: true,
        };
    }

    return {
        bodyWords,
        readabilityMaxAttempts: READABILITY_MAX_ATTEMPTS,
        humanizePass1Max: 3,
        humanizePass2Max: 5,
        postHumanizeReadabilityMax: POST_HUMANIZE_READABILITY_MAX_ATTEMPTS,
        skipExtraAiPolish: false,
    };
}
