import { getCampusTenantKeyForHost } from "@/lib/faqCampusHostTenantKey";
import {
  PROGRAMME_CAMPUS_UNIS,
  programmeUniEnvKey,
  type ProgrammeCampusUniId,
  isProgrammeCampusUniId,
} from "@/lib/faqProgrammeCampusUnis";

export type CoreFaqTenantId = "kgp" | "cu" | "dyp" | "svu" | "cutn" | "vistas" | "demo";
export type FaqTenantId = CoreFaqTenantId | ProgrammeCampusUniId;

/** Hub login (`/ai-faq`) tiles — excludes `demo` (separate test slug). */
export type FaqHubTenantId = Exclude<FaqTenantId, "demo">;

/**
 * Tile order on `/ai-faq`: core universities first and last, programme microsites in the middle.
 * Keep in sync with `CORE_TILE_LOGO_URLS` / programme rows in `src/app/ai-faq/page.tsx`.
 */
export const FAQ_HUB_LOGIN_TILE_ORDER: readonly FaqHubTenantId[] = [
  "kgp",
  "cu",
  "dyp",
  ...(PROGRAMME_CAMPUS_UNIS.map((u) => u.id) as FaqHubTenantId[]),
  "svu",
  "cutn",
  "vistas",
];

type FaqTenantConfig = {
  id: FaqTenantId;
  label: string;
  upstreamBase: string;
};

const DEFAULT_KGP_UPSTREAM = "https://iitkgp-portal-server.upgrad.com";
const DEFAULT_CU_UPSTREAM = "https://portal-server.cuonlineedu.in";
/** DYP brand FAQ API (`GET …/api/faq/page`, `POST …/api/faq/page/bulk`). Override with `FAQ_DYP_UPSTREAM_BASE`. */
const DEFAULT_DYP_UPSTREAM = "https://portal-server.dypatiledu.com";
/** TalentEdge multi-tenant campus cluster for programme tiles when no per-tenant `FAQ_*_UPSTREAM_BASE` is set. */
const DEFAULT_PROGRAMME_CAMPUS_UPSTREAM = "https://prod-campus-portal-server.talentedge.dev";
const DEFAULT_DEMO_UPSTREAM = "https://demo.onlineuniversity.local";
const DEFAULT_SVU_UPSTREAM = "https://portal-server-v2.svuonline.in";
/** CUTN: `portal-server-v2.cutnonline.in` has no public DNS; API is on `portal-server`. Override with `FAQ_CUTN_UPSTREAM_BASE`. */
const DEFAULT_CUTN_UPSTREAM = "https://portal-server.cutnonline.in";
const DEFAULT_VISTAS_UPSTREAM = "https://portal-server-v2.vistasonlineedu.in";

const programmeTenantConfig = Object.fromEntries(
  PROGRAMME_CAMPUS_UNIS.map((u) => {
    const ek = programmeUniEnvKey(u.id);
    return [
      u.id,
      {
        id: u.id,
        label: u.label,
        upstreamBase: (
          process.env[`FAQ_${ek}_UPSTREAM_BASE`] ||
          process.env.FAQ_DYP_UPSTREAM_BASE ||
          DEFAULT_PROGRAMME_CAMPUS_UPSTREAM
        )
          .trim()
          .replace(/\/+$/, ""),
      },
    ] as const;
  }),
) as Record<ProgrammeCampusUniId, FaqTenantConfig>;

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
  dyp: {
    id: "dyp",
    label: "DYP",
    upstreamBase: (process.env.FAQ_DYP_UPSTREAM_BASE || DEFAULT_DYP_UPSTREAM).trim().replace(/\/+$/, ""),
  },
  svu: {
    id: "svu",
    label: "SVU",
    upstreamBase: (process.env.FAQ_SVU_UPSTREAM_BASE || DEFAULT_SVU_UPSTREAM).trim().replace(/\/+$/, ""),
  },
  cutn: {
    id: "cutn",
    label: "CUTN",
    upstreamBase: (process.env.FAQ_CUTN_UPSTREAM_BASE || DEFAULT_CUTN_UPSTREAM).trim().replace(/\/+$/, ""),
  },
  vistas: {
    id: "vistas",
    label: "VISTAS",
    upstreamBase: (process.env.FAQ_VISTAS_UPSTREAM_BASE || DEFAULT_VISTAS_UPSTREAM).trim().replace(/\/+$/, ""),
  },
  demo: {
    id: "demo",
    label: "Online University",
    upstreamBase: (process.env.FAQ_DEMO_UPSTREAM_BASE || DEFAULT_DEMO_UPSTREAM).trim().replace(/\/+$/, ""),
  },
  ...programmeTenantConfig,
};

export function isFaqTenantId(value: unknown): value is FaqTenantId {
  return (
    value === "kgp" ||
    value === "cu" ||
    value === "dyp" ||
    value === "svu" ||
    value === "cutn" ||
    value === "vistas" ||
    value === "demo" ||
    isProgrammeCampusUniId(value)
  );
}

export function getFaqUpstreamBaseForTenant(tenantId: FaqTenantId): string {
  return FAQ_TENANT_CONFIG[tenantId].upstreamBase;
}

/**
 * Resolves the FAQ API origin for tenant `dyp` given the incoming request host.
 * Brand DYP (`portal-server.dypatiledu.com`) is the default; mapped campus hosts or
 * `FAQ_DYP_X_TENANT_KEY` (local campus testing) use the TalentEdge campus cluster unless
 * `FAQ_DYP_UPSTREAM_BASE` is set (always wins).
 */
export function resolveDypFaqUpstreamBase(host: string): string {
  const explicit = process.env.FAQ_DYP_UPSTREAM_BASE?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (getCampusTenantKeyForHost(host) || process.env.FAQ_DYP_X_TENANT_KEY?.trim()) {
    return DEFAULT_PROGRAMME_CAMPUS_UPSTREAM;
  }
  return DEFAULT_DYP_UPSTREAM;
}
