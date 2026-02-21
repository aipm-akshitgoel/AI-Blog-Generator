export interface MetaOption {
    title: string;
    description: string;
    explanation: string; // Plain-English tooltip explaining why it's good
}

export interface MetaSeoPayload {
    options: MetaOption[];
}
