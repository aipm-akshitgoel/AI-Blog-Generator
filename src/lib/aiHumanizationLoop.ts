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
 * Runs humanize even when the pre-key ZeroGPT check fails — final ZeroGPT runs after keywords.
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
    const preHumanizeZeroGptError = initialStatus.error;

    if (!getAiHumanizeConfig()) {
        return {
            contentMarkdown: initialMarkdown,
            aiDetection: baselineDetection
                ? toAiDetectionScore(baselineDetection, 0)
                : null,
            skippedReason:
                "AI Humanize not configured (AI_HUMANIZE_API_KEY + AI_HUMANIZE_EMAIL) — showing ZeroGPT score only",
        };
    }

    if (maxAttempts <= 0) {
        return {
            contentMarkdown: initialMarkdown,
            aiDetection: baselineDetection
                ? toAiDetectionScore(baselineDetection, 0)
                : null,
            skippedReason:
                "Humanize skipped for this run (time budget). Re-run optimize on a shorter draft or try again.",
        };
    }

    if (!baselineDetection && preHumanizeZeroGptError) {
        console.warn(
            "[ai-humanize] Pre-humanize ZeroGPT unavailable; running humanize anyway:",
            preHumanizeZeroGptError,
        );
    }

    let bestMarkdown = initialMarkdown;
    let bestDetection = baselineDetection;
    let attemptsUsed = 0;
    let skippedReason: string | undefined;
    let lastHumanizedMarkdown: string | null = null;

    while (attemptsUsed < maxAttempts) {
        attemptsUsed++;
        try {
            const candidate = await humanize(initialMarkdown);
            lastHumanizedMarkdown = candidate;
            const next = await detectAiContentPercent(candidate);
            if (next) {
                if (!bestDetection || next.aiPercent < bestDetection.aiPercent) {
                    bestMarkdown = candidate;
                    bestDetection = next;
                }
                if (meetsAiDetectionTarget(bestDetection.aiPercent)) {
                    break;
                }
            } else if (candidate.trim()) {
                bestMarkdown = candidate;
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

    if (attemptsUsed > 0 && lastHumanizedMarkdown && bestMarkdown === initialMarkdown) {
        bestMarkdown = lastHumanizedMarkdown;
    }

    const detectionForScore = bestDetection ?? {
        aiPercent: baselineDetection?.aiPercent ?? 100,
        humanPercent: baselineDetection?.humanPercent ?? 0,
        confidence: baselineDetection?.confidence,
    };

    if (attemptsUsed > 0 && !bestDetection && preHumanizeZeroGptError) {
        skippedReason =
            skippedReason ??
            `Pre-humanize ZeroGPT check failed (${preHumanizeZeroGptError}). Humanize ran ${attemptsUsed} pass(es); final AI % is measured after keywords.`;
    } else if (attemptsUsed > 0 && !bestDetection) {
        skippedReason =
            skippedReason ??
            `Humanize ran ${attemptsUsed} pass(es) but ZeroGPT could not verify pre-keyword scores.`;
    } else if (attemptsUsed === 0 && preHumanizeZeroGptError && !skippedReason) {
        skippedReason = `Pre-humanize ZeroGPT check failed (${preHumanizeZeroGptError}). Humanize did not run.`;
    }

    return {
        contentMarkdown: bestMarkdown,
        aiDetection:
            attemptsUsed > 0 || baselineDetection
                ? toAiDetectionScore(detectionForScore, attemptsUsed)
                : null,
        skippedReason,
    };
}
