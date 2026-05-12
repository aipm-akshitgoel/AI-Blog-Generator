import crypto from "node:crypto";
import {
  FAQ_HUB_LOGIN_TILE_ORDER,
  FAQ_TENANT_CONFIG,
  type FaqTenantId,
  isFaqTenantId,
} from "@/lib/faqTenantConfig";
import {
  PROGRAMME_CAMPUS_UNIS,
  defaultProgrammeCampusPassword,
  programmeUniEnvKey,
  type ProgrammeCampusUniId,
} from "@/lib/faqProgrammeCampusUnis";

export const FAQ_TENANT_COOKIE_NAME = "faq_tenant_session";

type TenantCredential = {
  username: string;
  password: string;
};

const programmeCredentials = Object.fromEntries(
  PROGRAMME_CAMPUS_UNIS.map((u) => {
    const ek = programmeUniEnvKey(u.id);
    return [
      u.id,
      {
        username: (process.env[`FAQ_${ek}_USERNAME`] || `${u.id}@aifaq.com`).trim().toLowerCase(),
        password: (process.env[`FAQ_${ek}_PASSWORD`] || defaultProgrammeCampusPassword(u.id)).trim(),
      },
    ] as const;
  }),
) as Record<ProgrammeCampusUniId, TenantCredential>;

const TENANT_CREDENTIALS: Record<FaqTenantId, TenantCredential> = {
  kgp: {
    username: "iitkgp@aifaq.com",
    password: "pass@kgp672",
  },
  cu: {
    username: "cuonline@aifaq.com",
    password: "pass@cu345",
  },
  dyp: {
    username: (process.env.FAQ_DYP_USERNAME || "dyp@aifaq.com").trim().toLowerCase(),
    password: (process.env.FAQ_DYP_PASSWORD || "pass@dyp891").trim(),
  },
  svu: {
    username: (process.env.FAQ_SVU_USERNAME || "svu@aifaq.com").trim().toLowerCase(),
    password: (process.env.FAQ_SVU_PASSWORD || "pass@svu441").trim(),
  },
  cutn: {
    username: (process.env.FAQ_CUTN_USERNAME || "cutn@aifaq.com").trim().toLowerCase(),
    password: (process.env.FAQ_CUTN_PASSWORD || "pass@cutn552").trim(),
  },
  vistas: {
    username: (process.env.FAQ_VISTAS_USERNAME || "vistas@aifaq.com").trim().toLowerCase(),
    password: (process.env.FAQ_VISTAS_PASSWORD || "pass@vistas663").trim(),
  },
  demo: {
    username: "onlineuniversity@aifaq.com",
    password: "pass@demo123",
  },
  ...programmeCredentials,
};

export type DefaultFaqLoginCredentialRow = {
  id: FaqTenantId;
  label: string;
  username: string;
  password: string;
};

/**
 * Default usernames/passwords when env overrides are unset: same order as `/ai-faq` hub tiles, then `demo`
 * (test slug). **Server-only** — do not import from client components (`node:crypto`).
 */
export function listDefaultFaqLoginCredentialRows(): DefaultFaqLoginCredentialRow[] {
  const hub = FAQ_HUB_LOGIN_TILE_ORDER.map((id) => ({
    id,
    label: FAQ_TENANT_CONFIG[id].label,
    username: TENANT_CREDENTIALS[id].username,
    password: TENANT_CREDENTIALS[id].password,
  }));
  return [
    ...hub,
    {
      id: "demo",
      label: FAQ_TENANT_CONFIG.demo.label,
      username: TENANT_CREDENTIALS.demo.username,
      password: TENANT_CREDENTIALS.demo.password,
    },
  ];
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getTenantIdFromCookieHeader(cookieHeader: string | null): FaqTenantId | null {
  if (!cookieHeader) return null;
  const entries = cookieHeader.split(";").map((entry) => entry.trim());
  const sessionEntry = entries.find((entry) => entry.startsWith(`${FAQ_TENANT_COOKIE_NAME}=`));
  if (!sessionEntry) return null;
  let value = decodeURIComponent(sessionEntry.slice(FAQ_TENANT_COOKIE_NAME.length + 1)).trim().toLowerCase();
  if (value === "agenticai") value = "agenticaicourse_in";
  return isFaqTenantId(value) ? (value as FaqTenantId) : null;
}

export function getTenantIdFromRequest(req: Request): FaqTenantId | null {
  return getTenantIdFromCookieHeader(req.headers.get("cookie"));
}

export function isValidTenantLogin(tenant: FaqTenantId, username: string, password: string): boolean {
  const expected = TENANT_CREDENTIALS[tenant];
  return safeEqual(username.trim().toLowerCase(), expected.username) && safeEqual(password, expected.password);
}
