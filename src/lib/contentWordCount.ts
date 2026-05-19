/** Trailing FAQ section heading in article markdown (duplicated when `faqs` JSON is used). */
const FAQ_SECTION_HEADING_RE = /\n#{1,3}\s+(?:frequently\s+asked\s+questions|faqs?)\b[^\n]*\n/i;

/** Remove FAQ block from markdown (from ## FAQs / ## Frequently Asked Questions through end). */
export function stripFaqBlockFromMarkdown(markdown: string): string {
    let body = String(markdown || "").trim();
    if (!body) return "";

    const idx = body.search(FAQ_SECTION_HEADING_RE);
    if (idx > 0) {
        return body.slice(0, idx).trimEnd();
    }
    if (idx === 0) {
        return "";
    }
    return body;
}

/** When structured FAQs exist, body markdown must not repeat them. */
export function stripFaqFromMarkdownWhenStructured(
    markdown: string,
    faqs?: { question: string; answer: string }[] | null,
): string {
    if (!Array.isArray(faqs) || faqs.length === 0) return String(markdown || "").trim();
    return stripFaqBlockFromMarkdown(markdown);
}

/** Count words in article body markdown (excludes trailing FAQ block when detectable). */
export function countMarkdownBodyWords(markdown: string): number {
    const body = stripFaqBlockFromMarkdown(markdown);
    if (!body) return 0;
    return body.split(/\s+/).filter(Boolean).length;
}
