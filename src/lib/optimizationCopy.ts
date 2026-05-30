/** User-facing copy for the content optimization step (order matches the AI pass). */

export const OPTIMIZATION_LOADING_TITLE = "Optimizing your draft…";

const STRUCTURE_STEP = "Optimizing structure and headings";

/** Rotates during the loading screen (~12s per step). */
export const OPTIMIZATION_LOADING_STEPS = [
    STRUCTURE_STEP,
    "Adding internal links",
    "Improving readability",
    "Verifying readability with SEO Review Tools",
    "Humanizing with AI Humanize (enhanced)",
    "Restoring headings and keywords",
    "Final humanize pass (keyword-safe)",
    "Checking AI detection with ZeroGPT",
    "Re-measuring final readability",
    "Polishing grammar and formatting",
] as const;

/** Loading steps shown while optimize runs (omit structure when TOC is already set). */
export function getOptimizationLoadingSteps(skipStructureStep = false): string[] {
    if (!skipStructureStep) return [...OPTIMIZATION_LOADING_STEPS];
    return OPTIMIZATION_LOADING_STEPS.filter((s) => s !== STRUCTURE_STEP);
}

export const OPTIMIZATION_LINKS_PHASE =
    "Gathering published posts for internal link targets…";

export const OPTIMIZATION_TIMING_NOTE =
    "Longer drafts can take a few minutes — keep this tab open.";

export const REFINE_LOADING_TITLE = "Applying SEO fixes…";

export const REFINE_LOADING_DETAIL =
    "Re-running readability, tone, and keyword placement based on your insights.";

export const REFINE_LOADING_DETAIL_TOC_LOCKED =
    "Re-running readability and keyword placement — your finalized outline is unchanged.";

export const OPTIMIZED_CONTENT_SUBTITLE =
    "Structured, readable, with internal links — review scores and edit before publish.";

export function optimizationLoadingStepIndex(
    elapsedSeconds: number,
    steps: readonly string[] = OPTIMIZATION_LOADING_STEPS,
): number {
    if (elapsedSeconds <= 0 || steps.length === 0) return 0;
    const stepDuration = 12;
    return Math.min(steps.length - 1, Math.floor(elapsedSeconds / stepDuration));
}
