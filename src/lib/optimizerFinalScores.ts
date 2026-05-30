import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import { normalizeMarkdownBodyParagraphs } from "@/lib/markdownParagraphs";
import { normalizeMarkdownForStorage } from "@/lib/markdownHtml";
import { measureFinalReadability } from "@/lib/readabilityImprovement";
import { applyZeroGptDetectionToScores, detectAiContentPercentWithStatus, isZeroGptEnabled } from "@/lib/zerogptAiDetection";

/**
 * Always measure readability on the final markdown before returning to the client.
 * ZeroGPT runs only when ZEROGPT_ENABLED=true.
 */
export async function applyFinalOptimizerScores(
    optimized: OptimizedContent,
    blogPost: BlogPost,
    humanizeAttempts = 0,
    targetGradeMax?: number,
): Promise<void> {
    optimized.contentMarkdown = normalizeMarkdownForStorage(
        normalizeMarkdownBodyParagraphs(optimized.contentMarkdown || ""),
    );

    const scoreTitle = blogPost.h1Title || optimized.title || blogPost.title;

    if (!optimized.seoScores.readabilityGrade) {
        const readability = await measureFinalReadability(optimized.contentMarkdown, scoreTitle, {
            targetGradeMax,
        });
        if (readability.readabilityGrade) {
            optimized.seoScores = {
                ...optimized.seoScores,
                readability: readability.readabilityPercent,
                readabilityGrade: readability.readabilityGrade,
            };
        }
    }

    if (isZeroGptEnabled() && optimized.seoScores.aiDetection?.provider !== "zerogpt") {
        const aiStatus = await detectAiContentPercentWithStatus(optimized.contentMarkdown);
        if (aiStatus.result) {
            optimized.seoScores = applyZeroGptDetectionToScores(
                optimized.seoScores,
                aiStatus.result,
                humanizeAttempts,
            );
            delete optimized.seoScores.aiDetectionError;
        } else if (aiStatus.error) {
            optimized.seoScores = {
                ...optimized.seoScores,
                aiDetectionError: aiStatus.error,
            };
        }
    }
}
