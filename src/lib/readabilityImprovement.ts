import type { BlogPost } from "@/lib/types/content";
import type { ReadabilityGrade } from "@/lib/types/optimization";
import {
    assistantMessageText,
    createAzureClient,
    type AzureConfig,
} from "@/lib/azureOpenAI";
import {
    fetchReadabilityScore,
    fleschEaseToReadabilityPercent,
    meetsReadabilityTarget,
    READABILITY_MAX_ATTEMPTS,
    type ReadabilityGradeResult,
} from "@/lib/seoReviewToolsReadability";

export const READABILITY_IMPROVE_USER_PROMPT =
    "Improve the readability. Bring the text to a 7th–8th grade reading level (Flesch-Kincaid). Use shorter sentences, simpler everyday words, and clear paragraphs. Keep all facts, headings, and markdown links unchanged.";

const READABILITY_API_UNAVAILABLE =
    "SEO Review Tools readability API failed — check SEO_REVIEW_TOOLS_API_KEY and credits on the server.";

function buildReadabilitySystemPrompt(): string {
    return `You are an expert editor focused only on readability for web articles.

${READABILITY_IMPROVE_USER_PROMPT}

Rules:
- Return ONLY the revised article body as markdown (no JSON, no code fences, no commentary).
- Preserve every ## and ### heading text exactly unless a tiny wording change is required for clarity.
- Preserve all [anchor](url) internal links exactly (same URLs and anchors).
- Do NOT add an H1. Do NOT add a ## FAQs section.
- No em-dashes (—). Avoid "delve", "elevate", "moreover", "in today's landscape".
- Target Flesch-Kincaid grade 7–8: plain language, average sentence length under 20 words where possible.`;
}

function buildRetryUserPrompt(
    markdown: string,
    measurement: ReadabilityGradeResult,
    attempt: number,
): string {
    return `The article is still too advanced for our audience (Flesch-Kincaid ${measurement.gradeLabel}, score ${measurement.fleschScore}). Attempt ${attempt} of ${READABILITY_MAX_ATTEMPTS}.

Simplify further: shorter sentences, simpler words, split long paragraphs. Grade must be 8th grade or below.

Article markdown:
${markdown}`;
}

function pickLowestGradeCandidate(
    candidates: { markdown: string; measurement: ReadabilityGradeResult }[],
): { markdown: string; measurement: ReadabilityGradeResult } {
    return candidates.reduce((best, cur) => {
        if (cur.measurement.gradeLevel < best.measurement.gradeLevel) return cur;
        if (cur.measurement.gradeLevel > best.measurement.gradeLevel) return best;
        return cur.measurement.fleschScore >= best.measurement.fleschScore ? cur : best;
    });
}

function toReadabilityGrade(
    measurement: ReadabilityGradeResult,
    attempts: number,
    isFinal: boolean,
): ReadabilityGrade {
    return {
        gradeLevel: measurement.gradeLevel,
        gradeLabel: measurement.gradeLabel,
        fleschScore: measurement.fleschScore,
        fleschLabel: measurement.fleschLabel,
        targetMet: meetsReadabilityTarget(measurement.gradeLevel),
        attempts,
        provider: "seo-review-tools",
        isFinal,
    };
}

async function improveReadabilityWithModel(
    azure: AzureConfig,
    markdown: string,
    blogPost: BlogPost,
    options?: { measurement?: ReadabilityGradeResult; attempt?: number },
): Promise<string> {
    const client = createAzureClient(azure);
    const userContent =
        options?.measurement && options.attempt
            ? buildRetryUserPrompt(markdown, options.measurement, options.attempt)
            : `Revise this blog article markdown for grade 7–8 readability:\n\n${markdown}`;

    const response = await client.chat.completions.create({
        model: azure.deployment,
        max_completion_tokens: 4000,
        messages: [
            { role: "system", content: buildReadabilitySystemPrompt() },
            {
                role: "user",
                content: `Title (context only): ${blogPost.title}\n\n${userContent}`,
            },
        ],
    });

    let text = assistantMessageText((response as { choices?: { message?: { content?: string } }[] })
        ?.choices?.[0]?.message?.content);
    text = text.replace(/^```(?:markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!text) return markdown;
    return text.replace(/\\n/g, "\n");
}

export type ReadabilityLoopResult = {
    contentMarkdown: string;
    readabilityGrade: ReadabilityGrade | null;
    readabilityPercent: number;
    skippedReason?: string;
};

/** Improvement loop: up to 3 edits; keeps the version with the lowest grade level. */
export async function runReadabilityImprovementLoop(
    azure: AzureConfig,
    blogPost: BlogPost,
    initialMarkdown: string,
): Promise<ReadabilityLoopResult> {
    const candidates: { markdown: string; measurement: ReadabilityGradeResult }[] = [];
    let markdown = initialMarkdown;
    let attemptsUsed = 0;
    const title = blogPost.h1Title || blogPost.title;

    const measure = async () => fetchReadabilityScore(markdown, undefined, { title });

    let measurement = await measure();
    if (!measurement) {
        return {
            contentMarkdown: markdown,
            readabilityGrade: null,
            readabilityPercent: 0,
            skippedReason: READABILITY_API_UNAVAILABLE,
        };
    }

    candidates.push({ markdown, measurement });

    while (attemptsUsed < READABILITY_MAX_ATTEMPTS) {
        if (meetsReadabilityTarget(measurement.gradeLevel)) {
            break;
        }

        attemptsUsed++;
        markdown = await improveReadabilityWithModel(azure, markdown, blogPost, {
            measurement,
            attempt: attemptsUsed,
        });
        measurement = (await measure()) ?? measurement;
        candidates.push({ markdown, measurement });
    }

    const best = pickLowestGradeCandidate(candidates);
    const readabilityGrade = toReadabilityGrade(best.measurement, attemptsUsed, false);

    return {
        contentMarkdown: best.markdown,
        readabilityGrade,
        readabilityPercent: fleschEaseToReadabilityPercent(best.measurement.fleschScore),
    };
}

/** Final measurement after humanization (no rewrites). */
export async function measureFinalReadability(
    markdown: string,
    title?: string,
): Promise<ReadabilityLoopResult> {
    const measurement = await fetchReadabilityScore(markdown, undefined, { title });
    if (!measurement) {
        return {
            contentMarkdown: markdown,
            readabilityGrade: null,
            readabilityPercent: 0,
            skippedReason: READABILITY_API_UNAVAILABLE,
        };
    }

    const readabilityGrade = toReadabilityGrade(measurement, 0, true);

    return {
        contentMarkdown: markdown,
        readabilityGrade,
        readabilityPercent: fleschEaseToReadabilityPercent(measurement.fleschScore),
    };
}
