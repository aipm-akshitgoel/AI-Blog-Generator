/** Rules for agents — internal research must not appear as outbound links in published posts. */
export const NO_SOURCES_IN_CONTENT_RULE = `
INTERNAL CONTEXT (never publish): Inputs like business profile, strategy, author notes, uploads, or future SEO tools are for writing accuracy only.
- Do NOT cite Semrush, analytics tools, "our research", or "according to data" in the article.
- Do NOT add outbound links to tool vendors, dashboards, or source documentation.
- Only include hyperlinks that belong editorially in the post (e.g. internal links from BusinessContext.internalLinks when appropriate).
`;
