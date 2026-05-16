export interface SupplementaryFile {
    name: string;
    type: string;
    content: string;
}

export interface TopicBrief {
    userNotes: string;
    supplementaryFiles: SupplementaryFile[];
}

export const EMPTY_TOPIC_BRIEF: TopicBrief = {
    userNotes: "",
    supplementaryFiles: [],
};
