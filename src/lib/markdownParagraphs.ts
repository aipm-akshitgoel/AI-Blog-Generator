/**
 * Fix body copy where each sentence became its own markdown paragraph (double newline between lines).
 * Common after AI Humanize / keyword-weave passes.
 */

function isStructuralBlock(text: string): boolean {
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

/**
 * Merge consecutive one-line blocks into proper paragraphs; keep headings and lists as-is.
 */
export function normalizeMarkdownBodyParagraphs(markdown: string): string {
    const blocks = String(markdown || "")
        .split(/\n\n+/)
        .map((b) => b.trim())
        .filter(Boolean);

    if (blocks.length === 0) return String(markdown || "").trim();

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
