export interface LinkedinPost {
    contentMarkdown: string;
    hashtags: string[];
    hooks: string[];
    suggestedFormat: "storytelling" | "listicle" | "thought-leadership" | "announcement";
}
