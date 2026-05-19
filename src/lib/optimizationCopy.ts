/** User-facing copy for the content optimization step (order matches the AI pass). */

export const OPTIMIZATION_LOADING_TITLE = "Optimizing your draft…";

/** Rotates during the loading screen (~12s per step). */
export const OPTIMIZATION_LOADING_STEPS = [
    "Humanizing AI phrasing",
    "Checking originality",
    "Optimizing structure and headings",
    "Adding internal links",
    "Improving readability and grammar",
    "Polishing formatting consistency",
] as const;

export const OPTIMIZATION_LINKS_PHASE =
    "Gathering published posts for internal link targets…";

export const OPTIMIZATION_TIMING_NOTE =
    "Longer drafts can take a few minutes — keep this tab open.";

export const REFINE_LOADING_TITLE = "Applying SEO fixes…";

export const REFINE_LOADING_DETAIL =
    "Re-running structure, readability, tone, and keyword placement based on your insights.";

export const OPTIMIZED_CONTENT_SUBTITLE =
    "Structured, readable, with internal links — review scores and edit before publish.";

export function optimizationLoadingStepIndex(elapsedSeconds: number): number {
    if (elapsedSeconds <= 0) return 0;
    const stepDuration = 12;
    return Math.min(
        OPTIMIZATION_LOADING_STEPS.length - 1,
        Math.floor(elapsedSeconds / stepDuration),
    );
}
