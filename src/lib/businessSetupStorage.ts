/** Browser session keys for setup / profile / strategy (cleared on account reset). */
export const BUSINESS_SETUP_STORAGE_KEYS = [
  "bloggieai_local_business_context",
  "bloggieai_local_strategy_session",
  "bloggieai_local_seo_defaults",
  "bloggieai_strategy_saved",
  "bloggieai_context_skipped",
  "bloggieai_writer_unlocked",
] as const;

export function clearBusinessSetupStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of BUSINESS_SETUP_STORAGE_KEYS) {
    window.sessionStorage.removeItem(key);
  }
}
