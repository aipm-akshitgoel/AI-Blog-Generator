import type { FactSource } from "@/lib/types/factSource";
import type { KeywordPlan } from "@/lib/types/keywordPlan";

export interface BlogPost {
    title: string;
    h1Title?: string;
    h2Suggestions?: string[];
    slug: string;
    metaDescription: string;
    contentMarkdown: string;
    faqs: { question: string; answer: string }[];
    /** Editor-only attributions — produced at generation from brief/files/profile. */
    factSources?: FactSource[];
    /** Primary / secondary / tertiary keywords and writer-chosen density targets. */
    keywordPlan?: KeywordPlan;
    status: "draft" | "published";
    createdAt?: string;
}
