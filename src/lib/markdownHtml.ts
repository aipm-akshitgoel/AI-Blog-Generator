import { marked } from "marked";

marked.setOptions({
    gfm: true,
    breaks: false,
});

/** Markdown (GFM tables, etc.) → HTML for TipTap / preview. */
export async function markdownToHtml(markdown: string): Promise<string> {
    const html = await marked.parse(String(markdown || ""));
    return String(html || "<p></p>");
}
