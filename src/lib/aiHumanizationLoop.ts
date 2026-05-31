import type { AiDetectionScore } from "@/lib/types/optimization";
import {
    getAiHumanizeConfig,
    humanizeMarkdown,
    humanizeMarkdownPreservingHeadings,
} from "@/lib/aiHumanize";
import {
    AI_DETECTION_MAX_HUMANIZE_ATTEMPTS,
    detectAiContentPercent,
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
 * ZeroGPT runs after each pass only (not before the first pass) to pick the best version
 * and stop early below 20%. Final ZeroGPT on the published draft runs after keywords.
 */
export async function runAiHumanizationLoop(
    initialMarkdown: string,
    options?: AiHumanizationLoopOptions,
): Promise<AiHumanizationLoopResult> {
    const maxAttempts = options?.maxAttempts ?? AI_DETECTION_MAX_HUMANIZE_ATTEMPTS;
    const preserveHeadings = options?.preserveHeadings !== false;
    const humanize = preserveHeadings ? humanizeMarkdownPreservingHeadings : humanizeMarkdown;

    if (!getAiHumanizeConfig()) {
        return {
            contentMarkdown: initialMarkdown,
            aiDetection: null,
            skippedReason:
                "AI Humanize not configured (AI_HUMANIZE_API_KEY + AI_HUMANIZE_EMAIL) — showing ZeroGPT score only",
        };
    }

    if (maxAttempts <= 0) {
        return {
            contentMarkdown: initialMarkdown,
            aiDetection: null,
            skippedReason:
                "Humanize skipped for this run (time budget). Re-run optimize on a shorter draft or try again.",
        };
    }

    let bestMarkdown = initialMarkdown;
    let bestDetection: { aiPercent: number; humanPercent: number; confidence?: string } | null =
        null;
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
                if (meetsAiDetectionTarget(next.aiPercent)) {
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

    if (attemptsUsed > 0 && !bestDetection) {
        skippedReason =
            skippedReason ??
            `Humanize ran ${attemptsUsed} pass(es) but ZeroGPT could not verify pre-keyword scores. Final AI % is measured after keywords.`;
    }

    return {
        contentMarkdown: bestMarkdown,
        aiDetection: bestDetection ? toAiDetectionScore(bestDetection, attemptsUsed) : null,
        skippedReason,
    };
}
