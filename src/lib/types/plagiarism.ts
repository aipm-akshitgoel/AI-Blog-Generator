export interface PlagiarismReport {
    isSafe: boolean;
    overallSimilarity: number; // 0-100 indicating percentage match across the web
    flaggedSections: {
        textSegment: string;
        similarityScore: number;
        sourceUrl?: string; // Where the similar text was found
    }[];
}
