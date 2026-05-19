/** Internal attribution for a claim in the draft — never published in contentMarkdown. */
export interface FactSource {
    id: string;
    excerpt: string;
    source: string;
    /** Optional link to open when the citation is expanded. */
    url?: string;
    /** Character offsets in contentMarkdown when the fact was tagged. */
    startIndex?: number;
    endIndex?: number;
}

export const FACT_SOURCE_PRESETS = [
    "Business profile",
    "SEO strategy",
    "Author brief",
    "Uploaded file",
    "Semrush",
    "Content team",
    "On-page analysis",
] as const;
