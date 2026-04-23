import crypto from "node:crypto";
import { FaqTenantId, isFaqTenantId } from "@/lib/faqTenantConfig";

export const FAQ_TENANT_COOKIE_NAME = "faq_tenant_session";

type TenantCredential = {
  username: string;
  password: string;
};

const TENANT_CREDENTIALS: Record<FaqTenantId, TenantCredential> = {
  kgp: {
    username: "iitkgp@aifaq.com",
    password: "pass@kgp672",
  },
  cu: {
    username: "cuonline@aifaq.com",
    password: "pass@cu345",
  },
};

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
  const value = decodeURIComponent(sessionEntry.slice(FAQ_TENANT_COOKIE_NAME.length + 1)).trim().toLowerCase();
  return isFaqTenantId(value) ? value : null;
}

export function getTenantIdFromRequest(req: Request): FaqTenantId | null {
  return getTenantIdFromCookieHeader(req.headers.get("cookie"));
}

export function isValidTenantLogin(tenant: FaqTenantId, username: string, password: string): boolean {
  const expected = TENANT_CREDENTIALS[tenant];
  return safeEqual(username.trim().toLowerCase(), expected.username) && safeEqual(password, expected.password);
}
