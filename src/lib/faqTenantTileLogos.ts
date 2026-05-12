import type { CoreFaqTenantId } from "@/lib/faqTenantConfig";

/** Core universities shown on `/ai-faq` (non-demo). */
export type CoreHubTenantId = Exclude<CoreFaqTenantId, "demo">;

/**
 * Header / OG marks discovered from each public site (same assets the marketing pages use).
 * Hosts without an entry rely on `tenantLogoCandidateUrls` (favicon → touch icon → Google domain favicon → 🎓).
 */
export const CORE_TILE_LOGO_URLS: Partial<Record<CoreHubTenantId, string>> = {
  kgp: "https://iitkgp-pages.upgrad.com/IIT_KGP_logo_1770299096244_4ae17ebb2f0ff22b.png",
  cu: "https://pages.cuonlineedu.in/image__28__1751007179275_df8d3434dc3c69f7.png",
  dyp: "https://pages.dypatiledu.com/dyp-online-logo__1__1771588255684_424fe95cea0dedb5.webp",
  /** Header mark from `cutn.ac.in` (public WP theme). */
  cutn: "https://cutn.ac.in/wp-content/uploads/2023/07/cropped-LOGO_ORIGINAL_CUTN-scaled-1-192x192.jpg",
  svu: "https://svu.edu.in/images/logo.png",
  vistas: "https://pages.vistasonlineedu.in/Fevicon_1777547315273_c43b3669c821c369.webp",
};

/**
 * Favicon / mark URLs for AI FAQ login tiles.
 * Optional `prioritizedAbsolute` is tried first (e.g. `pages.talentedge.dev` header logo from the live site).
 */
export function tenantLogoCandidateUrls(logoHost: string, prioritizedAbsolute?: string | null): string[] {
  const h = logoHost.trim().toLowerCase().split(":")[0] || "";
  const tail =
    h.length > 0
      ? [
          `https://${h}/favicon.ico`,
          `https://${h}/apple-touch-icon.png`,
          `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=128`,
        ]
      : [];
  const head = prioritizedAbsolute?.trim() ? [prioritizedAbsolute.trim()] : [];
  return [...head, ...tail];
}
