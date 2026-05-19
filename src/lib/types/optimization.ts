import type { PlagiarismReport } from "./plagiarism";
import type { FactSource } from "./factSource";

export interface SeoScores {
    readability: number;
    grammar: number;
    /** Estimated % of copy that reads AI-generated (lower is better). */
    aiContentPercent: number;
    originality: number;
    actionableInsights: string[];
    /** @deprecated Legacy fields from older optimizer responses */
    overall?: number;
    contentStructure?: number;
    targetKeywords?: string[];
}

export interface OptimizedContent {
    title: string;
    slug: string;
    metaDescription: string;
    contentMarkdown: string;
    faqs: { question: string; answer: string }[];
    internalLinks: { href: string; anchorText: string; target: "blog" | "service" | "page" }[];
    seoScores: SeoScores;
    plagiarismReport: PlagiarismReport;
    /** Editor-only fact attribution; not included in published markdown. */
    factSources?: FactSource[];
}
