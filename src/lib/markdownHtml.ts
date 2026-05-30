import { marked } from "marked";
import { normalizeMarkdownTables } from "@/lib/markdownStructure";

marked.setOptions({
    gfm: true,
    breaks: false,
});

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

/** Markdown → HTML for TipTap (normalized tables + cell paragraphs). */
export async function markdownToHtmlForEditor(markdown: string): Promise<string> {
    const normalized = normalizeMarkdownTables(String(markdown || ""));
    const raw = await marked.parse(normalized);
    const html = wrapTableCellsForTipTap(String(raw || "<p></p>"));
    return html || "<p></p>";
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
