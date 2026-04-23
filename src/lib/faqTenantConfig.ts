export type FaqTenantId = "kgp" | "cu";

type FaqTenantConfig = {
  id: FaqTenantId;
  label: string;
  upstreamBase: string;
};

const DEFAULT_KGP_UPSTREAM = "https://iitkgp-portal-server.upgrad.com";
const DEFAULT_CU_UPSTREAM = "https://portal-server.cuonlineedu.in";

export const FAQ_TENANT_CONFIG: Record<FaqTenantId, FaqTenantConfig> = {
  kgp: {
    id: "kgp",
    label: "IIT KGP",
    upstreamBase: (process.env.FAQ_KGP_UPSTREAM_BASE || DEFAULT_KGP_UPSTREAM).trim().replace(/\/+$/, ""),
  },
  cu: {
    id: "cu",
    label: "CUOnline",
    upstreamBase: (process.env.FAQ_CU_UPSTREAM_BASE || DEFAULT_CU_UPSTREAM).trim().replace(/\/+$/, ""),
  },
};

export function isFaqTenantId(value: unknown): value is FaqTenantId {
  return value === "kgp" || value === "cu";
}

export function getFaqUpstreamBaseForTenant(tenantId: FaqTenantId): string {
  return FAQ_TENANT_CONFIG[tenantId].upstreamBase;
}
