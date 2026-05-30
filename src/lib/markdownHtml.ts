import { marked } from "marked";
import {
    markdownTableToHtml,
    normalizeMarkdownTables,
    splitMarkdownPreservingStructure,
} from "@/lib/markdownStructure";

marked.setOptions({
    gfm: true,
    breaks: false,
});

/** True when markdown likely contains a GFM table (pipes row). */
export function markdownContainsGfmTable(markdown: string): boolean {
    return /^\s*\|[^|\n]+\|/m.test(String(markdown || ""));
}

/**
 * TipTap table cells require block content (`content: "block+"`).
 * marked outputs bare text in <td>/<th>, which ProseMirror drops → pipes show as plain text.
 */
export function wrapTableCellsForTipTap(html: string): string {
    return String(html || "").replace(/<t([dh])([^>]*)>([\s\S]*?)<\/t\1>/gi, (_match, kind, attrs, inner) => {
        const tag = `t${kind}`;
        const trimmed = inner.trim();
        if (!trimmed) {
            return `<${tag}${attrs}><p></p></${tag}>`;
        }
        if (/^<(p|ul|ol|blockquote|div|h[1-6])\b/i.test(trimmed)) {
            return `<${tag}${attrs}>${inner}</${tag}>`;
        }
        return `<${tag}${attrs}><p>${trimmed}</p></${tag}>`;
    });
}

/** Markdown → HTML for TipTap (per-part tables + cell paragraphs). */
export async function markdownToHtmlForEditor(markdown: string): Promise<string> {
    const normalized = normalizeMarkdownTables(String(markdown || ""));
    const parts = splitMarkdownPreservingStructure(normalized);
    const chunks: string[] = [];

    for (const part of parts) {
        if (part.type === "table") {
            const tableHtml = markdownTableToHtml(part.text);
            if (tableHtml) chunks.push(wrapTableCellsForTipTap(tableHtml));
            continue;
        }
        const text = part.text.trim();
        if (!text) continue;
        const html = await marked.parse(text);
        chunks.push(String(html || ""));
    }

    const combined = chunks.filter(Boolean).join("\n");
    return wrapTableCellsForTipTap(combined) || "<p></p>";
}

/** Markdown (GFM tables, etc.) → HTML for static preview / publish. */
export async function markdownToHtml(markdown: string): Promise<string> {
    const normalized = normalizeMarkdownTables(String(markdown || ""));
    const html = await marked.parse(normalized);
    return String(html || "<p></p>");
}

/** Normalize GFM table spacing in stored markdown (safe to run on save/load). */
export function normalizeMarkdownForStorage(markdown: string): string {
    return normalizeMarkdownTables(String(markdown || "")).trim();
}
