import type { AiDetectionScore } from "@/lib/types/optimization";
import {
    getAiHumanizeConfig,
    humanizeMarkdown,
    humanizeMarkdownPreservingHeadings,
} from "@/lib/aiHumanize";
import {
    AI_DETECTION_MAX_HUMANIZE_ATTEMPTS,
    detectAiContentPercent,
    detectAiContentPercentWithStatus,
    meetsAiDetectionTarget,
} from "@/lib/zerogptAiDetection";

function toAiDetectionScore(
    detection: { aiPercent: number; humanPercent: number; confidence?: string },
    attempts: number,
): AiDetectionScore {
    return {
        aiPercent: detection.aiPercent,
        humanPercent: detection.humanPercent,
        targetMet: meetsAiDetectionTarget(detection.aiPercent),
        attempts,
        provider: "zerogpt",
        confidence: detection.confidence,
    };
}

export type AiHumanizationLoopResult = {
    contentMarkdown: string;
    aiDetection: AiDetectionScore | null;
    skippedReason?: string;
};

export type AiHumanizationLoopOptions = {
    /** Max full-article humanize passes (default from env cap). */
    maxAttempts?: number;
    /** Keep markdown headings unchanged (recommended — protects readability structure). */
    preserveHeadings?: boolean;
};

/**
 * Humanize up to maxAttempts times, each pass rewriting the **original** draft (not chained).
 * Keeps whichever version (original or any pass) has the lowest ZeroGPT AI % pre-keywords.
 * Does not skip when the baseline is already below target — keyword boost runs after this step.
 */
export async function runAiHumanizationLoop(
    initialMarkdown: string,
    options?: AiHumanizationLoopOptions,
): Promise<AiHumanizationLoopResult> {
    const maxAttempts = options?.maxAttempts ?? AI_DETECTION_MAX_HUMANIZE_ATTEMPTS;
    const preserveHeadings = options?.preserveHeadings !== false;
    const humanize = preserveHeadings ? humanizeMarkdownPreservingHeadings : humanizeMarkdown;

    const initialStatus = await detectAiContentPercentWithStatus(initialMarkdown);
    const baselineDetection = initialStatus.result;
    if (!baselineDetection) {
        return {
            contentMarkdown: initialMarkdown,
            aiDetection: null,
            skippedReason:
                initialStatus.error ??
                "ZeroGPT not configured (ZEROGPT_API_KEY) or detection API unavailable",
        };
    }

    if (!getAiHumanizeConfig()) {
        return {
            contentMarkdown: initialMarkdown,
            aiDetection: toAiDetectionScore(baselineDetection, 0),
            skippedReason:
                "AI Humanize not configured (AI_HUMANIZE_API_KEY + AI_HUMANIZE_EMAIL) — showing ZeroGPT score only",
        };
    }

    if (maxAttempts <= 0) {
        return {
            contentMarkdown: initialMarkdown,
            aiDetection: toAiDetectionScore(baselineDetection, 0),
            skippedReason:
                "Humanize skipped for this run (time budget). Re-run optimize on a shorter draft or try again.",
        };
    }

    let bestMarkdown = initialMarkdown;
    let bestDetection = baselineDetection;
    let attemptsUsed = 0;
    let skippedReason: string | undefined;

    while (attemptsUsed < maxAttempts) {
        attemptsUsed++;
        try {
            const candidate = await humanize(initialMarkdown);
            const next = await detectAiContentPercent(candidate);
            if (!next) break;
            if (next.aiPercent < bestDetection.aiPercent) {
                bestMarkdown = candidate;
                bestDetection = next;
            }
            if (meetsAiDetectionTarget(bestDetection.aiPercent)) {
                break;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "AI Humanize rewrite failed";
            console.warn("[ai-humanize] rewrite failed:", err);
            skippedReason = msg.includes("enough words")
                ? "AI Humanize: no word credits remaining. Top up at aihumanize.io, then re-run optimize."
                : msg;
            break;
        }
    }

    return {
        contentMarkdown: bestMarkdown,
        aiDetection: toAiDetectionScore(bestDetection, attemptsUsed),
        skippedReason,
    };
}
