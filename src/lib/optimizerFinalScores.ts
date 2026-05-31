import type { BlogPost } from "@/lib/types/content";
import type { OptimizedContent } from "@/lib/types/optimization";
import { normalizeMarkdownBodyParagraphs } from "@/lib/markdownParagraphs";
import { normalizeMarkdownForStorage } from "@/lib/markdownHtml";
import { measureFinalReadability } from "@/lib/readabilityImprovement";

/**
 * Always measure readability on the final markdown before returning to the client.
 * Does not clear existing scores when the API is temporarily unavailable.
 */
export async function applyFinalOptimizerScores(
    optimized: OptimizedContent,
    blogPost: BlogPost,
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
}
