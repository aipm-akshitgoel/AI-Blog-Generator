import { stripOuterMarkdownFence } from "@/lib/azureOpenAI";
import { sanitizeJsonString } from "@/lib/sanitizeJson";

export function extractFirstJsonObject(input: string): string | null {
    const text = String(input || "");
    let start = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === "{") {
            if (depth === 0) start = i;
            depth++;
            continue;
        }

        if (ch === "}") {
            if (depth > 0) {
                depth--;
                if (depth === 0 && start >= 0) {
                    return text.slice(start, i + 1);
                }
            }
        }
    }
    return null;
}

/** Parse JSON from an LLM text response (fences, trailing prose, minor escaping issues). */
export function parseJsonFromModelText<T>(raw: string): T | null {
    const trimmed = String(raw || "").trim().replace(/^\uFEFF/, "");
    if (!trimmed) return null;

    const deFenced = stripOuterMarkdownFence(trimmed);
    const candidates = [deFenced, sanitizeJsonString(deFenced)];

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate) as T;
        } catch {
            /* try extract */
        }
        const extracted = extractFirstJsonObject(candidate);
        if (!extracted) continue;
        for (const ex of [extracted, sanitizeJsonString(extracted)]) {
            try {
                return JSON.parse(ex) as T;
            } catch {
                /* next */
            }
        }
    }
    return null;
}
