import { normalizeMarkdownBodyParagraphs } from "@/lib/markdownParagraphs";
import {
    isMarkdownTableBlock,
    normalizeMarkdownTables,
    repairMarkdownTableBlock,
    splitMarkdownPreservingStructure,
} from "@/lib/markdownStructure";

export type { MarkdownPart } from "@/lib/markdownStructure";
export {
    splitMarkdownPreservingStructure,
    splitMarkdownPreservingStructure as splitMarkdownPreservingHeadings,
} from "@/lib/markdownStructure";

/**
 * AI Humanize rewrite API
 * @see https://aihumanize.io/api
 */

const REWRITE_URL = "https://aihumanize.io/api/v1/rewrite";
const MIN_CHARS = 100;
const MAX_CHARS = 10_000;

/** Minimum prose characters before the humanize loop runs (matches API chunk floor). */
export const AI_HUMANIZE_MIN_BODY_CHARS = MIN_CHARS;

/** 0 = quality, 1 = balance, 2 = enhanced (best for bypassing ZeroGPT / AI detectors). */
export const AI_HUMANIZE_MODEL_ENHANCED = "2";

export type AiHumanizeConfig = { apiKey: string; email: string; model: string };

/** How much copy AI Humanize can rewrite (headings stay verbatim). */
export type HumanizeMarkdownSummary = {
    bodyPartCount: number;
    bodyCharCount: number;
    tablePartCount: number;
    /** Cell text inside GFM tables (also sent to AI Humanize advanced). */
    tableCellCharCount: number;
    headingPartCount: number;
    /** Estimated rewrite API calls (body + table chunks). */
    estimatedApiCalls: number;
};

function tableCellTextCharCount(tableMarkdown: string): number {
    const repaired = repairMarkdownTableBlock(String(tableMarkdown || "").trim());
    if (!repaired || !isMarkdownTableBlock(repaired)) return 0;
    return repaired
        .split("\n")
        .filter((line) => line.trim() && !/^\|?\s*[-:| ]+\|?\s*$/.test(line.trim()))
        .join("")
        .replace(/\|/g, "")
        .replace(/\s+/g, " ")
        .trim().length;
}

export function summarizeHumanizeMarkdown(markdown: string): HumanizeMarkdownSummary {
    const parts = splitMarkdownPreservingStructure(normalizeMarkdownTables(markdown));
    let bodyPartCount = 0;
    let bodyCharCount = 0;
    let tableCellCharCount = 0;
    let estimatedApiCalls = 0;

    for (const part of parts) {
        if (part.type === "heading") continue;
        if (part.type === "table") {
            const cells = tableCellTextCharCount(part.text);
            tableCellCharCount += cells;
            if (cells >= MIN_CHARS) {
                estimatedApiCalls += chunkMarkdownForHumanize(part.text).length;
            }
            continue;
        }
        const text = part.text.trim();
        if (!text) continue;
        bodyPartCount++;
        bodyCharCount += text.length;
        estimatedApiCalls += chunkMarkdownForHumanize(text).length;
    }

    return {
        bodyPartCount,
        bodyCharCount,
        tablePartCount: parts.filter((p) => p.type === "table").length,
        tableCellCharCount,
        headingPartCount: parts.filter((p) => p.type === "heading").length,
        estimatedApiCalls,
    };
}

export function getAiHumanizeConfig(): AiHumanizeConfig | null {
    const apiKey = process.env.AI_HUMANIZE_API_KEY?.trim();
    const email = process.env.AI_HUMANIZE_EMAIL?.trim();
    if (!apiKey || !email) return null;
    const model = process.env.AI_HUMANIZE_MODEL?.trim() || AI_HUMANIZE_MODEL_ENHANCED;
    return { apiKey, email, model };
}

type RewriteResponse = {
    code?: number;
    msg?: string;
    data?: string;
};

/** Split markdown into rewrite chunks (100–10k chars), preferring paragraph boundaries. */
export function chunkMarkdownForHumanize(markdown: string): string[] {
    const text = String(markdown || "").trim();
    if (!text) return [];
    if (text.length <= MAX_CHARS) {
        return text.length >= MIN_CHARS ? [text] : [text.padEnd(MIN_CHARS, " ")];
    }

    const blocks = text.split(/\n\n+/);
    const chunks: string[] = [];
    let buffer = "";

    const flush = () => {
        const trimmed = buffer.trim();
        if (!trimmed) return;
        if (trimmed.length <= MAX_CHARS) {
            chunks.push(trimmed.length >= MIN_CHARS ? trimmed : trimmed.padEnd(MIN_CHARS, " "));
            buffer = "";
            return;
        }
        let start = 0;
        while (start < trimmed.length) {
            let end = Math.min(start + MAX_CHARS, trimmed.length);
            if (end < trimmed.length) {
                const slice = trimmed.slice(start, end);
                const breakAt = slice.lastIndexOf("\n");
                if (breakAt > MIN_CHARS) end = start + breakAt;
            }
            let piece = trimmed.slice(start, end).trim();
            if (piece.length < MIN_CHARS && end < trimmed.length) {
                end = Math.min(start + MAX_CHARS, trimmed.length);
                piece = trimmed.slice(start, end).trim();
            }
            if (piece.length < MIN_CHARS) piece = piece.padEnd(MIN_CHARS, " ");
            chunks.push(piece);
            start = end;
        }
        buffer = "";
    };

    for (const block of blocks) {
        const next = buffer ? `${buffer}\n\n${block}` : block;
        if (next.length <= MAX_CHARS) {
            buffer = next;
        } else {
            flush();
            buffer = block;
        }
    }
    flush();

    return chunks.length > 0 ? chunks : [text.slice(0, MAX_CHARS)];
}

export async function humanizeMarkdownChunk(
    chunk: string,
    config?: { apiKey: string; email: string; model: string },
): Promise<string> {
    const cfg = config ?? getAiHumanizeConfig();
    if (!cfg) throw new Error("AI Humanize is not configured");

    const payload = chunk.trim();
    const data =
        payload.length >= MIN_CHARS ? payload : payload.padEnd(MIN_CHARS, " ");

    const res = await fetch(REWRITE_URL, {
        method: "POST",
        headers: {
            Authorization: cfg.apiKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: cfg.model,
            mail: cfg.email,
            data: data.slice(0, MAX_CHARS),
        }),
    });

    const json = (await res.json().catch(() => ({}))) as RewriteResponse;
    if (!res.ok || json.code !== 200 || typeof json.data !== "string") {
        const msg = json.msg || `AI Humanize failed (${res.status})`;
        throw new Error(msg);
    }
    return json.data.trim();
}

export async function humanizeMarkdown(
    markdown: string,
    config?: AiHumanizeConfig,
): Promise<string> {
    const cfg = config ?? getAiHumanizeConfig();
    if (!cfg) {
        throw new Error("AI_HUMANIZE_API_KEY and AI_HUMANIZE_EMAIL are not configured");
    }

    const chunks = chunkMarkdownForHumanize(markdown);
    if (chunks.length === 0) return markdown;

    const rewritten: string[] = [];
    for (const chunk of chunks) {
        rewritten.push(await humanizeMarkdownChunk(chunk, cfg));
    }

    return rewritten.join("\n\n").trim();
}

/**
 * Humanize GFM table block (advanced model). Keeps original table if rewrite breaks structure.
 */
async function humanizeMarkdownTable(
    tableMarkdown: string,
    cfg: AiHumanizeConfig,
): Promise<string> {
    const text = repairMarkdownTableBlock(String(tableMarkdown || "").trim());
    if (!text || !isMarkdownTableBlock(text)) return tableMarkdown;
    if (tableCellTextCharCount(text) < MIN_CHARS) return tableMarkdown;

    const rewritten = await humanizeMarkdown(text, cfg);
    const repaired = repairMarkdownTableBlock(rewritten.trim());
    return isMarkdownTableBlock(repaired) ? repaired : tableMarkdown;
}

/**
 * Humanize body copy and GFM tables — markdown headings stay verbatim.
 */
export async function humanizeMarkdownPreservingHeadings(
    markdown: string,
    config?: AiHumanizeConfig,
): Promise<string> {
    const cfg = config ?? getAiHumanizeConfig();
    if (!cfg) {
        throw new Error("AI_HUMANIZE_API_KEY and AI_HUMANIZE_EMAIL are not configured");
    }

    const parts = splitMarkdownPreservingStructure(normalizeMarkdownTables(markdown));
    const out: string[] = [];

    for (const part of parts) {
        if (part.type === "heading") {
            out.push(part.text);
            continue;
        }
        if (part.type === "table") {
            out.push(await humanizeMarkdownTable(part.text, cfg));
            continue;
        }
        const rewritten = await humanizeMarkdown(part.text, cfg);
        out.push(rewritten.trim() ? rewritten.trim() : part.text);
    }

    return normalizeMarkdownBodyParagraphs(
        out.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    );
}
