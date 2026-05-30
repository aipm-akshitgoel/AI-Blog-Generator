import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import { normalizeMarkdownBodyParagraphs } from "@/lib/markdownParagraphs";
import { normalizeMarkdownForStorage } from "@/lib/markdownHtml";
import { measureFinalReadability } from "@/lib/readabilityImprovement";
import { applyZeroGptDetectionToScores, detectAiContentPercent } from "@/lib/zerogptAiDetection";

/**
 * Always measure readability + ZeroGPT on the final markdown before returning to the client.
 * Does not clear existing scores when an API is temporarily unavailable.
 */
export async function applyFinalOptimizerScores(
    optimized: OptimizedContent,
    blogPost: BlogPost,
    humanizeAttempts = 0,
): Promise<void> {
    optimized.contentMarkdown = normalizeMarkdownForStorage(
        normalizeMarkdownBodyParagraphs(optimized.contentMarkdown || ""),
    );

    const scoreTitle = blogPost.h1Title || optimized.title || blogPost.title;

    const readability = await measureFinalReadability(optimized.contentMarkdown, scoreTitle);
    if (readability.readabilityGrade) {
        optimized.seoScores = {
            ...optimized.seoScores,
            readability: readability.readabilityPercent,
            readabilityGrade: readability.readabilityGrade,
        };
    }

    const ai = await detectAiContentPercent(optimized.contentMarkdown);
    if (ai) {
        optimized.seoScores = applyZeroGptDetectionToScores(
            optimized.seoScores,
            ai,
            humanizeAttempts,
        );
    }
}
