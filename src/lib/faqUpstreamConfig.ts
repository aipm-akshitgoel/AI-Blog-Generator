import { FaqTenantId, getFaqUpstreamBaseForTenant } from "@/lib/faqTenantConfig";

/** Base URL for FAQ API proxy (no trailing slash), resolved by authenticated tenant. */
export function getFaqUpstreamBase(tenantId: FaqTenantId): string {
  return getFaqUpstreamBaseForTenant(tenantId);
}
