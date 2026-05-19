/** Count words in article body markdown (excludes trailing FAQ block when detectable). */
export function countMarkdownBodyWords(markdown: string): number {
    let body = String(markdown || "").trim();
    if (!body) return 0;

    const faqSplit = body.search(/\n##\s+(?:frequently\s+asked\s+questions|faqs?)\b/i);
    if (faqSplit > 0) {
        body = body.slice(0, faqSplit).trim();
    }

    return body.split(/\s+/).filter(Boolean).length;
}
