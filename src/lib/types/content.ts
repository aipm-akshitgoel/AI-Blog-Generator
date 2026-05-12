export interface BlogPost {
    title: string;
    h1Title?: string;
    h2Suggestions?: string[];
    slug: string;
    metaDescription: string;
    contentMarkdown: string;
    faqs: { question: string; answer: string }[];
    status: "draft" | "published";
    createdAt?: string;
}
