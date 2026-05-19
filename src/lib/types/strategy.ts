export type StrategySource = "ai" | "manual";

/** One row in the manual content directory (H1 = blog topic). */
export interface ContentDirectoryEntry {
    id: string;
    /** Display order from spreadsheet (0-based). */
    order: number;
    h1: string;
    h2s: string[];
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
