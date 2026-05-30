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
 * Humanize until ZeroGPT AI % is below target, or attempts exhausted.
 * Uses AI Humanize "enhanced" model by default (see AI_HUMANIZE_MODEL).
 */
export async function runAiHumanizationLoop(
    initialMarkdown: string,
    options?: AiHumanizationLoopOptions,
): Promise<AiHumanizationLoopResult> {
    const maxAttempts = options?.maxAttempts ?? AI_DETECTION_MAX_HUMANIZE_ATTEMPTS;
    const preserveHeadings = options?.preserveHeadings !== false;
    const humanize = preserveHeadings ? humanizeMarkdownPreservingHeadings : humanizeMarkdown;

    let markdown = initialMarkdown;
    let attemptsUsed = 0;

    let detection = await detectAiContentPercent(markdown);
    if (!detection) {
        return {
            contentMarkdown: markdown,
            aiDetection: null,
            skippedReason:
                "ZeroGPT not configured (ZEROGPT_API_KEY) or detection API unavailable",
        };
    }

    if (!getAiHumanizeConfig()) {
        return {
            contentMarkdown: markdown,
            aiDetection: toAiDetectionScore(detection, 0),
            skippedReason:
                "AI Humanize not configured (AI_HUMANIZE_API_KEY + AI_HUMANIZE_EMAIL) — showing ZeroGPT score only",
        };
    }

    if (meetsAiDetectionTarget(detection.aiPercent)) {
        return {
            contentMarkdown: markdown,
            aiDetection: toAiDetectionScore(detection, 0),
        };
    }

    while (!meetsAiDetectionTarget(detection.aiPercent) && attemptsUsed < maxAttempts) {
        attemptsUsed++;
        try {
            markdown = await humanize(markdown);
        } catch (err) {
            console.warn("[ai-humanize] rewrite failed:", err);
            break;
        }
        const next = await detectAiContentPercent(markdown);
        if (!next) break;
        detection = next;
    }

    return {
        contentMarkdown: markdown,
        aiDetection: toAiDetectionScore(detection, attemptsUsed),
    };
}
