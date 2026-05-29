/** One keyword target finalized by the content writer (phrase + intended density). */
export interface KeywordTarget {
    phrase: string;
    /** Writer-chosen target density (% of words in the measured span). */
    targetDensityPercent: number;
    tier: "primary" | "secondary" | "tertiary";
    /** H2 or H3 section title when this keyword is scoped to a section. */
    sectionTitle?: string;
}

export interface KeywordPlan {
    primary: KeywordTarget;
    secondary: KeywordTarget[];
    tertiary: KeywordTarget[];
}

export type KeywordDensityVerificationRow = {
    tier: "primary" | "secondary" | "tertiary";
    label: string;
    phrase: string;
    targetDensityPercent: number;
    actualDensityPercent: number;
    missing?: boolean;
};

export type KeywordDensityVerification = {
    plan: KeywordPlan;
    rows: KeywordDensityVerificationRow[];
};
