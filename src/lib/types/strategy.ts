import type { ContentH2Section } from "@/lib/contentDirectorySections";

export type StrategySource = "ai" | "manual";

/** One row in the manual content directory (H1 = blog topic). */
export interface ContentDirectoryEntry {
    id: string;
    /** Display order from spreadsheet (0-based). */
    order: number;
    h1: string;
    /** Per-blog primary keyword (required in manual spreadsheet column B). */
    primaryKeyword?: string;
    /** H2 sections each with nested H3 headings (canonical structure). */
    sections?: ContentH2Section[];
    h2s: string[];
    /** Optional per-blog secondary keywords. */
    secondaryKeywords?: string[];
    /** Flat H3 list (derived from sections; kept for legacy consumers). */
    h3s?: string[];
    /** Optional per-blog tertiary keywords. */
    tertiaryKeywords?: string[];
    completed?: boolean;
    completedSlug?: string;
    completedTitle?: string;
}

export interface KeywordStrategy {
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchIntent: "informational" | "navigational" | "commercial" | "transactional";
    strategySource?: StrategySource;
    /** Official topic directory when strategySource is manual. */
    contentDirectory?: ContentDirectoryEntry[];
}

export interface TopicOption {
    title: string;
    description: string;
    cannibalizationRisk: boolean;
    cannibalizationReason?: string;
    /** H2 outline from manual directory (attached to this H1). */
    h2Titles?: string[];
    /** H2 sections with nested H3s from content directory. */
    sections?: ContentH2Section[];
    /** Per-blog primary keyword from content directory. */
    primaryKeyword?: string;
    secondaryKeywords?: string[];
    h3Titles?: string[];
    tertiaryKeywords?: string[];
    directoryId?: string;
    priority?: number;
    completed?: boolean;
    completedSlug?: string;
}

export interface InspirationContent {
    title: string;
    url: string;
    engagement: string;
    insights: string;
}

export interface StrategySession {
    id?: string;
    platform?: "blog" | "linkedin";
    businessContextId: string;
    /** Client-only hint when saving without a profile (domain from custom direction). */
    referenceDomain?: string;
    keywordStrategy: KeywordStrategy;
    topicOptions: TopicOption[];
    trendingTopics?: string[];
    inspiration?: InspirationContent[];
    status: "pending_review" | "approved" | "rejected";
    createdAt?: string;
}
