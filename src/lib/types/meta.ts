export interface MetaOption {
    title: string;
    description: string;
    explanation: string;
    category?: string;
}

export interface MetaSeoPayload {
    options: MetaOption[];
}
