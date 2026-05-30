import type { BlogPost } from "@/lib/types/content";
import type { ReadabilityGrade } from "@/lib/types/optimization";
import {
    assistantMessageText,
    createAzureClient,
    type AzureConfig,
} from "@/lib/azureOpenAI";
import { splitMarkdownPreservingHeadings } from "@/lib/aiHumanize";
import {
    fetchReadabilityScore,
    fleschEaseToReadabilityPercent,
    meetsReadabilityTarget,
    READABILITY_MAX_ATTEMPTS,
    type ReadabilityGradeResult,
} from "@/lib/seoReviewToolsReadability";

/** After humanize — extra edits without undoing detector-friendly tone. */
export const POST_HUMANIZE_READABILITY_MAX_ATTEMPTS = 3;
/** Flesch ease bar we aim for on the dashboard (0–100). */
export const FLESCH_READABILITY_BAR_TARGET = 60;

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

function buildPostHumanizeReadabilitySystemPrompt(): string {
    return `You are an expert editor simplifying web articles for a general audience (7th–8th grade reading level).

Rules:
- Return ONLY the revised markdown (no JSON, no code fences, no commentary).
- Use short sentences (aim under 18 words), everyday words, and clear paragraphs.
- Keep a natural, human voice — NOT stiff or obviously AI-written. No em-dashes (—).
- Avoid "delve", "elevate", "moreover", "in today's landscape", "it's important to note".
- Preserve every ## and ### heading line EXACTLY as given in each section (do not add or remove headings).
- Preserve all [anchor](url) internal links exactly (same URLs and anchor text).
- Preserve exact multi-word keyword phrases already in the text — do not delete or rephrase them.
- Do NOT add an H1 or a ## FAQs section.`;
}

function pickBestReadabilityCandidate(
    candidates: { markdown: string; measurement: ReadabilityGradeResult }[],
): { markdown: string; measurement: ReadabilityGradeResult } {
    return candidates.reduce((best, cur) => {
        const c = cur.measurement;
        const b = best.measurement;
        const cMet = meetsReadabilityTarget(c.gradeLevel);
        const bMet = meetsReadabilityTarget(b.gradeLevel);
        if (cMet && !bMet) return cur;
        if (!cMet && bMet) return best;
        if (c.fleschScore !== b.fleschScore) {
            return c.fleschScore > b.fleschScore ? cur : best;
        }
        return c.gradeLevel < b.gradeLevel ? cur : best;
    });
}

function needsReadabilityImprovement(measurement: ReadabilityGradeResult): boolean {
    return (
        !meetsReadabilityTarget(measurement.gradeLevel) ||
        measurement.fleschScore < FLESCH_READABILITY_BAR_TARGET
    );
}

async function improveReadabilityWithModel(
    azure: AzureConfig,
    markdown: string,
    blogPost: BlogPost,
    options?: { measurement?: ReadabilityGradeResult; attempt?: number; postHumanize?: boolean },
): Promise<string> {
    const client = createAzureClient(azure);
    const userContent =
        options?.measurement && options.attempt
            ? buildRetryUserPrompt(markdown, options.measurement, options.attempt)
            : `Revise this blog article markdown for grade 7–8 readability:\n\n${markdown}`;

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
    options?: { measurement?: ReadabilityGradeResult; attempt?: number; postHumanize?: boolean },
): Promise<string> {
    const parts = splitMarkdownPreservingHeadings(markdown);
    const out: string[] = [];

    for (const part of parts) {
        if (part.type === "heading") {
            out.push(part.text);
            continue;
        }
        const revised = await improveReadabilityWithModel(azure, part.text, blogPost, options);
        out.push(revised.trim() ? revised.trim() : part.text);
    }

    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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

    while (attemptsUsed < READABILITY_MAX_ATTEMPTS && needsReadabilityImprovement(measurement)) {
        attemptsUsed++;
        markdown = await improveMarkdownPreservingHeadings(azure, markdown, blogPost, {
            measurement,
            attempt: attemptsUsed,
        });
        measurement = (await measure()) ?? measurement;
        candidates.push({ markdown, measurement });
    }

    const best = pickBestReadabilityCandidate(candidates);
    const readabilityGrade = toReadabilityGrade(best.measurement, attemptsUsed, false);

    return {
        contentMarkdown: best.markdown,
        readabilityGrade,
        readabilityPercent: fleschEaseToReadabilityPercent(best.measurement.fleschScore),
    };
}

/**
 * Simplify copy after humanize/keyword passes — keeps headings and keyword phrases, then picks
 * the version with the best Flesch score while staying human-sounding.
 */
export async function runPostHumanizeReadabilityLoop(
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

    const maxAttempts = POST_HUMANIZE_READABILITY_MAX_ATTEMPTS;
    while (attemptsUsed < maxAttempts && needsReadabilityImprovement(measurement)) {
        attemptsUsed++;
        markdown = await improveMarkdownPreservingHeadings(azure, markdown, blogPost, {
            measurement,
            attempt: attemptsUsed,
            postHumanize: true,
        });
        measurement = (await measure()) ?? measurement;
        candidates.push({ markdown, measurement });
    }

    const best = pickBestReadabilityCandidate(candidates);
    const readabilityGrade = toReadabilityGrade(best.measurement, attemptsUsed, true);

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
