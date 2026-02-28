export interface KeywordStrategy {
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchIntent: "informational" | "navigational" | "commercial" | "transactional";
}

export interface TopicOption {
    title: string;
    description: string;
    cannibalizationRisk: boolean;
    cannibalizationReason?: string;
}

export interface InspirationContent {
    title: string;
    url: string;
    engagement: string;
    insights: string;
}

export interface StrategySession {
    id?: string;
    businessContextId: string;
    keywordStrategy: KeywordStrategy;
    topicOptions: TopicOption[];
    trendingTopics?: string[];
    inspiration?: InspirationContent[];
    status: "pending_review" | "approved" | "rejected";
    createdAt?: string;
}
