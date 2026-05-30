import type { PlagiarismReport } from "./plagiarism";
import type { FactSource } from "./factSource";
import type { KeywordDensityVerification, KeywordPlan } from "./keywordPlan";

/** Flesch-Kincaid grade from SEO Review Tools after the readability loop. */
export interface ReadabilityGrade {
    gradeLevel: number;
    gradeLabel: string;
    fleschScore: number;
    fleschLabel?: string;
    /** True when grade level is at or below the account readability target. */
    targetMet: boolean;
    attempts: number;
    provider: "seo-review-tools";
    /** Account target used when this score was measured. */
    targetGradeMax?: number;
    /** True when measured after humanization (dashboard-facing score). */
    isFinal?: boolean;
}

/** AI detection from ZeroGPT after the humanize loop. */
export interface AiDetectionScore {
    aiPercent: number;
    humanPercent: number;
    /** True when AI share is below 20%. */
    targetMet: boolean;
    attempts: number;
    provider: "zerogpt";
    confidence?: string;
    /** @deprecated Legacy payloads used Copyleaks */
    modelVersion?: string;
}

export interface SeoScores {
    readability: number;
    grammar: number;
    /** Estimated % of copy that reads AI-generated (lower is better). */
    aiContentPercent: number;
    originality: number;
    actionableInsights: string[];
    /** Verified grade from SEO Review Tools readability API (optimize step). */
    readabilityGrade?: ReadabilityGrade;
    /** Verified AI % from ZeroGPT (optimize step). */
    aiDetection?: AiDetectionScore;
    /** Why ZeroGPT could not verify AI % (e.g. credits exhausted). */
    aiDetectionError?: string;
    /** Why AI Humanize did not rewrite (missing API key, time budget, etc.). */
    humanizeSkippedReason?: string;
    /** Writer-finalized keyword plan + SEO Review Tools density verification. */
    keywordDensity?: KeywordDensityVerification;
    keywordPlan?: KeywordPlan;
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
