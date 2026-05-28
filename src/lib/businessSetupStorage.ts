import type { ContentGuidelines } from "@/lib/types/businessContext";

/** Browser session keys for setup / profile / strategy (cleared on account reset). */
export const LOCAL_CONTENT_GUIDELINES_KEY = "bloggieai_local_content_guidelines";

export const BUSINESS_SETUP_STORAGE_KEYS = [
  "bloggieai_local_business_context",
  "bloggieai_local_strategy_session",
  "bloggieai_local_seo_defaults",
  LOCAL_CONTENT_GUIDELINES_KEY,
  "bloggieai_strategy_saved",
  "bloggieai_context_skipped",
  "bloggieai_writer_unlocked",
] as const;

export function persistLocalContentGuidelines(guidelines: ContentGuidelines | undefined): void {
  if (typeof window === "undefined") return;
  if (!guidelines?.dos?.length && !guidelines?.donts?.length) {
    window.sessionStorage.removeItem(LOCAL_CONTENT_GUIDELINES_KEY);
    return;
  }
  window.sessionStorage.setItem(LOCAL_CONTENT_GUIDELINES_KEY, JSON.stringify(guidelines));
}

export function readLocalContentGuidelines(): ContentGuidelines | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(LOCAL_CONTENT_GUIDELINES_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ContentGuidelines;
  } catch {
    return undefined;
  }
}

export function clearBusinessSetupStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of BUSINESS_SETUP_STORAGE_KEYS) {
    window.sessionStorage.removeItem(key);
  }
}
