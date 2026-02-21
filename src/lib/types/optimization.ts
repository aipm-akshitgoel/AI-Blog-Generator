import type { PlagiarismReport } from "./plagiarism";

export interface OptimizedContent {
    // Original blog post fields
    title: string;
    slug: string;
    metaDescription: string;
    contentMarkdown: string;
    faqs: { question: string; answer: string }[];
    // New fields added by the Optimization Agent
    internalLinks: { href: string; anchorText: string; target: "blog" | "service" }[];
    // Detailed SEO scores for the analyzer UI
    seoScores: {
        overall: number; // 0-100
        contentStructure: number; // 0-100
        readability: number; // 0-100
        targetKeywords: string[];
        actionableInsights: string[];
    };
    plagiarismReport: PlagiarismReport;
}
