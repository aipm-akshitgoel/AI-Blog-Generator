import type { BlogPost } from "@/lib/types/content";
import type { ReadabilityGrade } from "@/lib/types/optimization";
import {
    assistantMessageText,
    createAzureClient,
    type AzureConfig,
} from "@/lib/azureOpenAI";
import { splitMarkdownPreservingStructure } from "@/lib/markdownStructure";
import { normalizeMarkdownBodyParagraphs } from "@/lib/markdownParagraphs";
import {
    buildReadabilityRetryHint,
    READABILITY_EDITORIAL_RULES,
    READABILITY_IMPROVE_SUMMARY,
} from "@/lib/readabilityEditorial";
import {
    fetchReadabilityScore,
    fleschEaseToReadabilityPercent,
    meetsReadabilityTarget,
    READABILITY_MAX_ATTEMPTS,
    type ReadabilityGradeResult,
} from "@/lib/seoReviewToolsReadability";
import {
    DEFAULT_READABILITY_TARGET_GRADE_MAX,
    normalizeReadabilityTargetGrade,
} from "@/lib/readabilityTarget";

export type ReadabilityLoopOptions = {
    maxAttempts?: number;
    targetGradeMax?: number;
};

/** After humanize — extra edits without undoing detector-friendly tone. */
export const POST_HUMANIZE_READABILITY_MAX_ATTEMPTS = 2;

export const READABILITY_IMPROVE_USER_PROMPT = READABILITY_IMPROVE_SUMMARY;

const READABILITY_API_UNAVAILABLE =
    "SEO Review Tools readability API failed — check SEO_REVIEW_TOOLS_API_KEY and credits on the server.";

function buildReadabilitySystemPrompt(): string {
    return `You are an expert web editor improving readability without dumbing down the voice.

${READABILITY_IMPROVE_SUMMARY}

${READABILITY_EDITORIAL_RULES}

Output:
- Return ONLY the revised article body as markdown (no JSON, no code fences, no commentary).
- Do NOT add an H1. Do NOT add a ## FAQs section.`;
}

function buildRetryUserPrompt(
    markdown: string,
    measurement: ReadabilityGradeResult,
    attempt: number,
    maxAttempts: number,
): string {
    return `${buildReadabilityRetryHint(measurement.gradeLabel, measurement.fleschScore, attempt, maxAttempts)}

Article markdown:
${markdown}`;
}

function toReadabilityGrade(
    measurement: ReadabilityGradeResult,
    attempts: number,
    isFinal: boolean,
    targetGradeMax = DEFAULT_READABILITY_TARGET_GRADE_MAX,
): ReadabilityGrade {
    const target = normalizeReadabilityTargetGrade(targetGradeMax);
    return {
        gradeLevel: measurement.gradeLevel,
        gradeLabel: measurement.gradeLabel,
        fleschScore: measurement.fleschScore,
        fleschLabel: measurement.fleschLabel,
        targetMet: meetsReadabilityTarget(measurement.gradeLevel, target),
        targetGradeMax: target,
        attempts,
        provider: "seo-review-tools",
        isFinal,
    };
}

function pickBestReadabilityCandidate(
    candidates: { markdown: string; measurement: ReadabilityGradeResult }[],
    targetGradeMax = DEFAULT_READABILITY_TARGET_GRADE_MAX,
): { markdown: string; measurement: ReadabilityGradeResult } {
    const target = normalizeReadabilityTargetGrade(targetGradeMax);
    return candidates.reduce((best, cur) => {
        const c = cur.measurement;
        const b = best.measurement;
        const cMet = meetsReadabilityTarget(c.gradeLevel, target);
        const bMet = meetsReadabilityTarget(b.gradeLevel, target);
        if (cMet && !bMet) return cur;
        if (!cMet && bMet) return best;

        if (cMet && bMet) {
            if (c.gradeLevel !== b.gradeLevel) {
                return c.gradeLevel > b.gradeLevel ? cur : best;
            }
            return c.fleschScore > b.fleschScore ? cur : best;
        }

        if (c.gradeLevel !== b.gradeLevel) {
            return c.gradeLevel < b.gradeLevel ? cur : best;
        }
        return c.fleschScore > b.fleschScore ? cur : best;
    });
}

function buildPostHumanizeReadabilitySystemPrompt(): string {
    return `You are an expert editor polishing web articles after AI humanization. Keep the human, professional tone.

${READABILITY_IMPROVE_SUMMARY}

${READABILITY_EDITORIAL_RULES}

Output:
- Return ONLY the revised markdown (no JSON, no code fences, no commentary).
- Preserve exact multi-word keyword phrases already in the text — do not delete or rephrase them.`;
}

/** Only rewrite when grade is above the account target ceiling. */
function needsReadabilityImprovement(
    measurement: ReadabilityGradeResult,
    targetGradeMax = DEFAULT_READABILITY_TARGET_GRADE_MAX,
): boolean {
    return measurement.gradeLevel > normalizeReadabilityTargetGrade(targetGradeMax);
}

async function improveReadabilityWithModel(
    azure: AzureConfig,
    markdown: string,
    blogPost: BlogPost,
    options?: {
        measurement?: ReadabilityGradeResult;
        attempt?: number;
        maxAttempts?: number;
        postHumanize?: boolean;
    },
): Promise<string> {
    const client = createAzureClient(azure);
    const maxAttempts = options?.maxAttempts ?? READABILITY_MAX_ATTEMPTS;
    const userContent =
        options?.measurement && options.attempt
            ? buildRetryUserPrompt(markdown, options.measurement, options.attempt, maxAttempts)
            : `Revise this section for plain professional readability (grade 9–10). Use bullet lists where appropriate:\n\n${markdown}`;

    const systemPrompt = options?.postHumanize
        ? buildPostHumanizeReadabilitySystemPrompt()
        : buildReadabilitySystemPrompt();

    const response = await client.chat.completions.create({
        model: azure.deployment,
        max_completion_tokens: 4000,
        messages: [
            { role: "system", content: systemPrompt },
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

/** Simplify body blocks only; heading lines are returned unchanged. */
async function improveMarkdownPreservingHeadings(
    azure: AzureConfig,
    markdown: string,
    blogPost: BlogPost,
    options?: {
        measurement?: ReadabilityGradeResult;
        attempt?: number;
        maxAttempts?: number;
        postHumanize?: boolean;
    },
): Promise<string> {
    const parts = splitMarkdownPreservingStructure(markdown);
    const out: string[] = [];
    const maxAttempts = options?.maxAttempts ?? READABILITY_MAX_ATTEMPTS;

    for (const part of parts) {
        if (part.type === "heading" || part.type === "table") {
            out.push(part.text);
            continue;
        }
        const revised = await improveReadabilityWithModel(azure, part.text, blogPost, {
            ...options,
            maxAttempts,
        });
        out.push(revised.trim() ? revised.trim() : part.text);
    }

    return normalizeMarkdownBodyParagraphs(
        out.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    );
}

export type ReadabilityLoopResult = {
    contentMarkdown: string;
    readabilityGrade: ReadabilityGrade | null;
    readabilityPercent: number;
    skippedReason?: string;
};

/** Improvement loop: up to N edits; keeps the best-scoring natural version that meets the grade ceiling. */
export async function runReadabilityImprovementLoop(
    azure: AzureConfig,
    blogPost: BlogPost,
    initialMarkdown: string,
    options?: ReadabilityLoopOptions,
): Promise<ReadabilityLoopResult> {
    const maxAttempts = options?.maxAttempts ?? READABILITY_MAX_ATTEMPTS;
    const targetGradeMax = normalizeReadabilityTargetGrade(options?.targetGradeMax);
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

    if (maxAttempts <= 0) {
        const readabilityGrade = toReadabilityGrade(measurement, 0, false, targetGradeMax);
        return {
            contentMarkdown: markdown,
            readabilityGrade,
            readabilityPercent: fleschEaseToReadabilityPercent(measurement.fleschScore),
        };
    }

    while (attemptsUsed < maxAttempts && needsReadabilityImprovement(measurement, targetGradeMax)) {
        attemptsUsed++;
        markdown = await improveMarkdownPreservingHeadings(azure, markdown, blogPost, {
            measurement,
            attempt: attemptsUsed,
            maxAttempts,
        });
        measurement = (await measure()) ?? measurement;
        candidates.push({ markdown, measurement });
    }

    const best = pickBestReadabilityCandidate(candidates, targetGradeMax);
    const readabilityGrade = toReadabilityGrade(best.measurement, attemptsUsed, false, targetGradeMax);

    return {
        contentMarkdown: best.markdown,
        readabilityGrade,
        readabilityPercent: fleschEaseToReadabilityPercent(best.measurement.fleschScore),
    };
}

/** Simplify copy after humanize/keyword passes when grade is still above the ceiling. */
export async function runPostHumanizeReadabilityLoop(
    azure: AzureConfig,
    blogPost: BlogPost,
    initialMarkdown: string,
    options?: ReadabilityLoopOptions,
): Promise<ReadabilityLoopResult> {
    const candidates: { markdown: string; measurement: ReadabilityGradeResult }[] = [];
    let markdown = initialMarkdown;
    let attemptsUsed = 0;
    const title = blogPost.h1Title || blogPost.title;
    const targetGradeMax = normalizeReadabilityTargetGrade(options?.targetGradeMax);

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

    const maxAttempts = options?.maxAttempts ?? POST_HUMANIZE_READABILITY_MAX_ATTEMPTS;
    if (maxAttempts <= 0) {
        const readabilityGrade = toReadabilityGrade(measurement, 0, true, targetGradeMax);
        return {
            contentMarkdown: markdown,
            readabilityGrade,
            readabilityPercent: fleschEaseToReadabilityPercent(measurement.fleschScore),
        };
    }

    while (attemptsUsed < maxAttempts && needsReadabilityImprovement(measurement, targetGradeMax)) {
        attemptsUsed++;
        markdown = await improveMarkdownPreservingHeadings(azure, markdown, blogPost, {
            measurement,
            attempt: attemptsUsed,
            maxAttempts,
            postHumanize: true,
        });
        measurement = (await measure()) ?? measurement;
        candidates.push({ markdown, measurement });
    }

    const best = pickBestReadabilityCandidate(candidates, targetGradeMax);
    const readabilityGrade = toReadabilityGrade(best.measurement, attemptsUsed, true, targetGradeMax);

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
    options?: Pick<ReadabilityLoopOptions, "targetGradeMax">,
): Promise<ReadabilityLoopResult> {
    const targetGradeMax = normalizeReadabilityTargetGrade(options?.targetGradeMax);
    const measurement = await fetchReadabilityScore(markdown, undefined, { title });
    if (!measurement) {
        return {
            contentMarkdown: markdown,
            readabilityGrade: null,
            readabilityPercent: 0,
            skippedReason: READABILITY_API_UNAVAILABLE,
        };
    }

    const readabilityGrade = toReadabilityGrade(measurement, 0, true, targetGradeMax);

    return {
        contentMarkdown: markdown,
        readabilityGrade,
        readabilityPercent: fleschEaseToReadabilityPercent(measurement.fleschScore),
    };
}
