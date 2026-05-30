/**
 * ZeroGPT AI Text Detection API
 * @see https://zerogpt.org/api
 */

export const AI_DETECTION_TARGET_PERCENT_MAX = 20;
export const AI_DETECTION_MAX_HUMANIZE_ATTEMPTS = 5;

const DEFAULT_ORG_DETECT_URL = "https://api.zerogpt.org/api/v1/developer/detect";
/** Legacy zerogpt.com keys (UUID) use ApiKey header + detectText endpoint. */
const DEFAULT_LEGACY_DETECT_URL = "https://api.zerogpt.com/api/detect/detectText";
/** Chunk long articles; API limit varies by plan. */
const MAX_CHARS_PER_REQUEST = 12_000;
const MIN_CHARS_FOR_DETECTION = 80;

type ZeroGptOrgResponse = {
    success?: boolean;
    data?: {
        aiPercentage?: number;
        ai_percentage?: number;
        isAI?: boolean;
        is_ai_generated?: boolean;
        confidence?: string;
        detectedModels?: string[];
        sentenceAnalysis?: Array<{ sentence?: string; isAI?: boolean; confidence?: number }>;
        sentence_analysis?: Array<{ sentence?: string; isAI?: boolean; is_ai?: boolean; confidence?: number }>;
    };
    message?: string;
};

type ZeroGptNetResponse = {
    success?: boolean;
    data?: {
        is_human_written?: number;
        is_gpt_generated?: number;
        feedback_message?: string;
    };
};

export function getZeroGptConfig(): { apiKey: string; detectUrl: string } | null {
    const apiKey = process.env.ZEROGPT_API_KEY?.trim();
    if (!apiKey) return null;
    const explicit = process.env.ZEROGPT_DETECT_URL?.trim();
    if (explicit) return { apiKey, detectUrl: explicit };
    // zerogpt.org developer keys (zgpt_sk_*); legacy dashboard keys are UUID-shaped.
    const detectUrl = apiKey.startsWith("zgpt_sk_")
        ? DEFAULT_ORG_DETECT_URL
        : DEFAULT_LEGACY_DETECT_URL;
    return { apiKey, detectUrl };
}

/** Plain text for detection — keep paragraph breaks (closer to pasting into zerogpt.com). */
export function markdownToPlainTextForDetection(markdown: string): string {
    return String(markdown || "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
        .replace(/[*_`]/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function chunkTextForDetection(text: string): string[] {
    if (text.length <= MAX_CHARS_PER_REQUEST) {
        return text.length >= MIN_CHARS_FOR_DETECTION ? [text] : [];
    }

    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + MAX_CHARS_PER_REQUEST, text.length);
        if (end < text.length) {
            const slice = text.slice(start, end);
            const lastSpace = slice.lastIndexOf(" ");
            if (lastSpace > MIN_CHARS_FOR_DETECTION) end = start + lastSpace;
        }
        const piece = text.slice(start, end).trim();
        if (piece.length >= MIN_CHARS_FOR_DETECTION) chunks.push(piece);
        start = end;
    }
    return chunks;
}

function numInRange(n: unknown): number | null {
    const v = Number(n);
    if (!Number.isFinite(v)) return null;
    return Math.min(100, Math.max(0, Math.round(v * 10) / 10));
}

function aiPercentFromSentenceAnalysis(data: Record<string, unknown>): number | null {
    const raw =
        data.sentenceAnalysis ??
        data.sentence_analysis ??
        data.sentences;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    let aiSentences = 0;
    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        if (row.isAI === true || row.is_ai === true) aiSentences++;
    }
    if (aiSentences === 0) return 0;
    return Math.round((aiSentences / raw.length) * 1000) / 10;
}

function parseAiPercentFromJson(json: unknown, detectUrl: string): number | null {
    if (!json || typeof json !== "object") return null;
    const root = json as Record<string, unknown>;
    const candidates: number[] = [];

    const data = root.data as Record<string, unknown> | undefined;
    if (data) {
        for (const key of [
            "aiPercentage",
            "ai_percentage",
            "is_gpt_generated",
            "is_ai_generated",
            "fakePercentage",
            "fake_percentage",
        ]) {
            const v = numInRange(data[key]);
            if (v != null) candidates.push(v);
        }
        const aiWords = Number(data.aiWords ?? data.ai_words);
        const textWords = Number(data.textWords ?? data.text_words);
        if (Number.isFinite(aiWords) && Number.isFinite(textWords) && textWords > 0) {
            const v = numInRange((aiWords / textWords) * 100);
            if (v != null) candidates.push(v);
        }
        const fromSentences = aiPercentFromSentenceAnalysis(data);
        if (fromSentences != null) candidates.push(fromSentences);
    }

    for (const key of ["aiPercentage", "ai_percentage"]) {
        const v = numInRange(root[key]);
        if (v != null) candidates.push(v);
    }

    const org = json as ZeroGptOrgResponse;
    if (org.data?.aiPercentage != null) {
        const v = numInRange(org.data.aiPercentage);
        if (v != null) candidates.push(v);
    }

    const net = json as ZeroGptNetResponse;
    if (net.data?.is_gpt_generated != null) {
        const v = numInRange(net.data.is_gpt_generated);
        if (v != null) candidates.push(v);
    }

    if (detectUrl.includes("detectText") && candidates.length === 0) {
        return null;
    }

    if (candidates.length === 0) return null;
    // Align with zerogpt.com highlighting: use the highest credible AI % signal.
    return Math.max(...candidates);
}

type DetectChunkResult =
    | { ok: true; aiPercent: number; confidence?: string }
    | { ok: false; error: string };

function zeroGptApiErrorMessage(json: unknown, httpStatus: number): string | null {
    if (!json || typeof json !== "object") return null;
    const root = json as Record<string, unknown>;
    if (root.success !== false) return null;
    const message = String(root.message ?? root.error ?? "").trim();
    if (message) return message;
    const code = root.code;
    return code != null ? `ZeroGPT error (${code})` : `ZeroGPT request failed (HTTP ${httpStatus})`;
}

async function detectChunk(
    apiKey: string,
    detectUrl: string,
    text: string,
): Promise<DetectChunkResult> {
    const isLegacyDetectText = detectUrl.includes("detectText");
    const body = isLegacyDetectText ? { input_text: text } : { text };

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };
    if (isLegacyDetectText) {
        headers.ApiKey = apiKey;
    } else {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    const res = await fetch(detectUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
        const apiMessage = zeroGptApiErrorMessage(json, res.status);
        const errText = apiMessage ?? JSON.stringify(json)?.slice(0, 200) ?? `HTTP ${res.status}`;
        console.warn("[zerogpt] detection failed", res.status, errText);
        return { ok: false, error: apiMessage ?? `ZeroGPT HTTP ${res.status}` };
    }

    const apiMessage = zeroGptApiErrorMessage(json, res.status);
    if (apiMessage) {
        console.warn("[zerogpt] detection rejected", apiMessage);
        return { ok: false, error: apiMessage };
    }

    const aiPercent = parseAiPercentFromJson(json, detectUrl);
    if (aiPercent == null) {
        console.warn("[zerogpt] could not parse AI percent from response", JSON.stringify(json)?.slice(0, 300));
        return { ok: false, error: "Could not parse ZeroGPT response" };
    }

    const org = json as ZeroGptOrgResponse;
    return {
        ok: true,
        aiPercent,
        confidence: org.data?.confidence,
    };
}

export type ZeroGptDetectionResult = {
    aiPercent: number;
    humanPercent: number;
    targetMet: boolean;
    confidence?: string;
};

export type ZeroGptDetectionStatus = {
    result: ZeroGptDetectionResult | null;
    error?: string;
};

export async function detectAiContentPercentWithStatus(
    markdown: string,
): Promise<ZeroGptDetectionStatus> {
    const config = getZeroGptConfig();
    if (!config) {
        return { result: null, error: "ZEROGPT_API_KEY is not configured on the server." };
    }

    const plain = markdownToPlainTextForDetection(markdown);
    if (plain.length < MIN_CHARS_FOR_DETECTION) {
        console.warn("[zerogpt] text too short for detection", plain.length);
        return { result: null, error: "Draft is too short for ZeroGPT detection." };
    }

    const chunks = chunkTextForDetection(plain);
    if (chunks.length === 0) {
        return { result: null, error: "Draft is too short for ZeroGPT detection." };
    }

    const chunkResults: { aiPercent: number; confidence?: string }[] = [];
    let lastError = "ZeroGPT detection failed";

    for (const chunk of chunks) {
        const result = await detectChunk(config.apiKey, config.detectUrl, chunk);
        if (!result.ok) {
            lastError = result.error;
            return { result: null, error: lastError };
        }
        chunkResults.push(result);
    }

    const aiPercent =
        chunkResults.length === 1
            ? chunkResults[0]!.aiPercent
            : Math.max(...chunkResults.map((r) => r.aiPercent));
    const confidence = chunkResults[chunkResults.length - 1]?.confidence;
    const humanPercent = Math.round((100 - aiPercent) * 10) / 10;

    return {
        result: {
            aiPercent,
            humanPercent,
            targetMet: aiPercent < AI_DETECTION_TARGET_PERCENT_MAX,
            confidence,
        },
    };
}

export async function detectAiContentPercent(
    markdown: string,
): Promise<ZeroGptDetectionResult | null> {
    const { result } = await detectAiContentPercentWithStatus(markdown);
    return result;
}

export function meetsAiDetectionTarget(aiPercent: number): boolean {
    return aiPercent < AI_DETECTION_TARGET_PERCENT_MAX;
}

/** Prefer verified ZeroGPT score over the optimizer model's aiContentPercent guess. */
export function getEffectiveAiContentPercent(scores: {
    aiContentPercent: number;
    aiDetection?: { aiPercent: number; provider?: string } | null;
}): { percent: number; verified: boolean } {
    if (
        scores.aiDetection?.provider === "zerogpt" &&
        Number.isFinite(scores.aiDetection.aiPercent)
    ) {
        return { percent: scores.aiDetection.aiPercent, verified: true };
    }
    return { percent: scores.aiContentPercent, verified: false };
}

export function applyZeroGptDetectionToScores<T extends { aiContentPercent: number; aiDetection?: import("@/lib/types/optimization").AiDetectionScore | null }>(
    scores: T,
    detection: ZeroGptDetectionResult,
    attempts = 0,
): T {
    return {
        ...scores,
        aiContentPercent: Math.round(detection.aiPercent),
        aiDetection: {
            aiPercent: detection.aiPercent,
            humanPercent: detection.humanPercent,
            targetMet: detection.targetMet,
            attempts,
            provider: "zerogpt",
            confidence: detection.confidence,
        },
    };
}
