export interface SupplementaryFile {
    name: string;
    type: string;
    content: string;
}

import type { ContentConstraints, InterlinkingRules } from "@/lib/types/contentSpec";

export const DEFAULT_INTERLINKING_RULES: InterlinkingRules = {
    instructions: "",
    minLinks: 4,
    maxLinks: 6,
};

export interface TopicBrief {
    userNotes: string;
    supplementaryFiles: SupplementaryFile[];
    contentConstraints?: ContentConstraints;
    interlinkingRules?: InterlinkingRules;
}

export const EMPTY_TOPIC_BRIEF: TopicBrief = {
    userNotes: "",
    supplementaryFiles: [],
    interlinkingRules: DEFAULT_INTERLINKING_RULES,
};
