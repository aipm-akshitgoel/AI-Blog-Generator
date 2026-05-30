"use client";

import { OptimizationAgentUI } from "@/components/OptimizationAgentUI";
import { buildMinimalBusinessContext } from "@/lib/strategyInputs";
import type { BlogPost } from "@/lib/types/content";
import type { SeoScores } from "@/lib/types/optimization";
import type { KeywordPlan } from "@/lib/types/keywordPlan";
import { DEFAULT_INTERLINKING_RULES } from "@/lib/types/topicBrief";

const PREVIEW_KEYWORD_PLAN: KeywordPlan = {
    primary: {
        phrase: "accredited online degree programs in India",
        targetDensityPercent: 1.6,
        tier: "primary",
    },
    secondary: [
        {
            phrase: "UGC approved online degrees",
            targetDensityPercent: 1.0,
            tier: "secondary",
        },
        {
            phrase: "online graduation courses in India",
            targetDensityPercent: 0.9,
            tier: "secondary",
        },
    ],
    tertiary: [],
};

const PREVIEW_POST: BlogPost = {
    title: "Accredited Online Degree Programs in India: A Complete Guide",
    slug: "accredited-online-degree-programs-india",
    metaDescription: "Explore UGC-approved online degree programs in India.",
    h1Title: "Accredited Online Degree Programs in India",
    status: "draft",
    faqs: [],
    contentMarkdown: `# Accredited Online Degree Programs in India

Online education has expanded access to accredited online degree programs in India for working professionals and recent graduates.

## Why choose UGC approved online degrees

Universities must meet national standards before they can offer online graduation courses in India through distance or digital modes.

## How to compare programs

Review accreditation, curriculum depth, and career outcomes before you enroll.`,
    keywordPlan: PREVIEW_KEYWORD_PLAN,
};

/** Matches a typical YourDegree optimize result — no API calls. */
const PREVIEW_SCORES: SeoScores = {
    readability: 42,
    grammar: 88,
    aiContentPercent: 17,
    originality: 96,
    actionableInsights: [],
    readabilityGrade: {
        gradeLevel: 13,
        gradeLabel: "College",
        fleschScore: 42,
        fleschLabel: "Difficult",
        targetMet: false,
        attempts: 0,
        provider: "seo-review-tools",
        targetGradeMax: 10,
        isFinal: true,
    },
    aiDetection: {
        aiPercent: 16.9,
        humanPercent: 83.1,
        targetMet: true,
        attempts: 3,
        provider: "zerogpt",
    },
    keywordPlan: PREVIEW_KEYWORD_PLAN,
};

export default function OptimizerPreviewPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
            <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
                    Local preview — no optimize API · no sign-in required
                </p>
                <h1 className="mb-1 text-2xl font-bold text-white">New blog post</h1>
                <p className="mb-8 text-sm text-neutral-400">YourDegree</p>
                <OptimizationAgentUI
                    post={PREVIEW_POST}
                    businessContext={buildMinimalBusinessContext({ platform: "blog" })}
                    interlinkingRules={DEFAULT_INTERLINKING_RULES}
                    previewScores={PREVIEW_SCORES}
                />
            </div>
        </main>
    );
}
