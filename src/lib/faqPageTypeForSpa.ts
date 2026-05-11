/**
 * The FAQ SPA (`public/ai-faq`) buckets tabs with
 * `apiPageType ?? type` — **apiPageType is checked first**. Upstreams often set
 * `apiPageType: "intent"` while the real surface is `pageType: "specialization"`.
 * Prefer programme-facing fields before falling back to `apiPageType`.
 */
export function pickRawFaqPageType(page: unknown): unknown {
  const p = page as Record<string, unknown> | null | undefined;
  if (!p || typeof p !== "object") return undefined;
  const ordered = [
    p.pageType,
    p.type,
    p.page_type,
    p.PageType,
    p.faqPageType,
    p.screenType,
    p.entityType,
  ];
  for (const c of ordered) {
    if (c != null && String(c).trim() !== "") return c;
  }
  return p.apiPageType;
}

/**
 * The FAQ SPA (`public/ai-faq`) treats a page as **main** only when
 * `pageType`/`type` is one of: `landing`, `program`, `main` (else **intent**).
 *
 * Product rule: only **blog** and **auxiliary** pages belong in intent; home,
 * landing, program, specialization, and former "intent" marketing pages are main.
 */
export function normalizeFaqPageTypeForSpa(raw: unknown): string {
  const n = String(raw ?? "").trim().toLowerCase();
  if (n === "blog" || n === "blog-post" || n === "article") return "blog";
  if (n === "auxiliary" || n === "aux") return "auxiliary";

  if (n === "home" || n === "homepage" || n === "index" || n === "root" || n === "main") return "main";
  if (n === "landing" || n === "intent" || n === "career" || n === "lp" || n === "campaign") return "landing";
  if (
    n === "specialization" ||
    n === "specialisation" ||
    n === "speciality" ||
    n === "spec" ||
    n === "specialization_page"
  ) {
    return "specialization";
  }

  if (
    n === "program" ||
    n === "degree" ||
    n === "course" ||
    n === "programme" ||
    n === "subprogram" ||
    n === "sub_program" ||
    n === "child_program" ||
    n === "track"
  ) {
    return "program";
  }

  return "program";
}

export function isFaqIntentOnlyPageType(raw: unknown): boolean {
  const t = normalizeFaqPageTypeForSpa(raw);
  return t === "blog" || t === "auxiliary";
}
