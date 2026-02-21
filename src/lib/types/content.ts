export interface BlogPost {
    title: string;
    slug: string;
    metaDescription: string;
    contentMarkdown: string;
    faqs: { question: string; answer: string }[];
    status: "draft" | "published";
    createdAt?: string;
}
