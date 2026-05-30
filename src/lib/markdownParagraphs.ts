/**
 * Fix body copy where each sentence became its own markdown paragraph (double newline between lines).
 * Common after AI Humanize / keyword-weave passes.
 */

import {
    isMarkdownTableBlock,
    splitMarkdownPreservingStructure,
    normalizeMarkdownTables,
} from "@/lib/markdownStructure";

function isStructuralBlock(text: string): boolean {
    if (isMarkdownTableBlock(text)) return true;
    const first = text.trim().split("\n")[0]?.trim() ?? "";
    if (/^#{1,6}\s/.test(first)) return true;
    if (/^[-*+]\s/.test(first)) return true;
    if (/^\d+\.\s/.test(first)) return true;
    if (/^>\s/.test(first)) return true;
    return false;
}

/** Single-line prose block (one sentence per "paragraph"). */
function isOrphanSentenceBlock(text: string): boolean {
    const t = text.trim();
    if (!t || t.includes("\n")) return false;
    if (isStructuralBlock(t)) return false;
    return true;
}

function normalizeBodyProse(text: string): string {
    const blocks = String(text || "")
        .split(/\n\n+/)
        .map((b) => b.trim())
        .filter(Boolean);

    if (blocks.length === 0) return String(text || "").trim();

    const out: string[] = [];
    let proseBuffer: string[] = [];

    const flushProse = () => {
        if (proseBuffer.length === 0) return;
        out.push(proseBuffer.join(" ").replace(/\s+/g, " ").trim());
        proseBuffer = [];
    };

    for (const block of blocks) {
        if (isOrphanSentenceBlock(block)) {
            proseBuffer.push(block);
            continue;
        }
        flushProse();
        out.push(block);
    }
    flushProse();

    return out.join("\n\n").trim();
}

/**
 * Merge consecutive one-line blocks into proper paragraphs; keep headings, lists, and tables as-is.
 */
export function normalizeMarkdownBodyParagraphs(markdown: string): string {
    const normalized = normalizeMarkdownTables(String(markdown || ""));
    const parts = splitMarkdownPreservingStructure(normalized);
    const out: string[] = [];

    for (const part of parts) {
        if (part.type === "table" || part.type === "heading") {
            out.push(part.text);
            continue;
        }
        const body = normalizeBodyProse(part.text);
        if (body) out.push(body);
    }

    return out.join("\n\n").trim();
}
