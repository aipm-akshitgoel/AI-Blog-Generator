import type { AiDetectionScore } from "@/lib/types/optimization";
import { getAiHumanizeConfig, humanizeMarkdown } from "@/lib/aiHumanize";
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

export async function runAiHumanizationLoop(
    initialMarkdown: string,
): Promise<AiHumanizationLoopResult> {
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

    while (!meetsAiDetectionTarget(detection.aiPercent) && attemptsUsed < AI_DETECTION_MAX_HUMANIZE_ATTEMPTS) {
        attemptsUsed++;
        try {
            markdown = await humanizeMarkdown(markdown);
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
