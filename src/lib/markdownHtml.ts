import { marked } from "marked";
import { normalizeMarkdownTables } from "@/lib/markdownStructure";

marked.setOptions({
    gfm: true,
    breaks: false,
});

/** Markdown (GFM tables, etc.) → HTML for TipTap / preview. */
export async function markdownToHtml(markdown: string): Promise<string> {
    const normalized = normalizeMarkdownTables(String(markdown || ""));
    const html = await marked.parse(normalized);
    return String(html || "<p></p>");
}
