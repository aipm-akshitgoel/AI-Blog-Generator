import {
  FaqTenantId,
  getFaqUpstreamBaseForTenant,
  resolveDypFaqUpstreamBase,
} from "@/lib/faqTenantConfig";
import { isProgrammeCampusUniId, programmeUniEnvKey } from "@/lib/faqProgrammeCampusUnis";

/** Base URL for FAQ API proxy (no trailing slash), resolved by authenticated tenant. */
export function getFaqUpstreamBase(tenantId: FaqTenantId): string {
  return getFaqUpstreamBaseForTenant(tenantId);
}

/** Same as {@link getFaqUpstreamBase} but host-aware for `dyp` (brand vs campus cluster). */
export function getFaqUpstreamBaseForRequest(tenantId: FaqTenantId, host: string): string {
  if (tenantId === "dyp") {
    return resolveDypFaqUpstreamBase(host);
  }
  return getFaqUpstreamBaseForTenant(tenantId);
}

/** Env var that overrides the default upstream for this tenant (for error hints). */
export function getFaqUpstreamBaseEnvVarName(tenantId: FaqTenantId): string {
  if (isProgrammeCampusUniId(tenantId)) {
    return `FAQ_${programmeUniEnvKey(tenantId)}_UPSTREAM_BASE`;
  }
  switch (tenantId) {
    case "kgp":
      return "FAQ_KGP_UPSTREAM_BASE";
    case "cu":
      return "FAQ_CU_UPSTREAM_BASE";
    case "dyp":
      return "FAQ_DYP_UPSTREAM_BASE";
    case "svu":
      return "FAQ_SVU_UPSTREAM_BASE";
    case "cutn":
      return "FAQ_CUTN_UPSTREAM_BASE";
    case "vistas":
      return "FAQ_VISTAS_UPSTREAM_BASE";
    case "demo":
      return "FAQ_DEMO_UPSTREAM_BASE";
    default:
      return "FAQ_DYP_UPSTREAM_BASE";
  }
}
