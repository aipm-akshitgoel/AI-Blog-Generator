import type { FaqTenantId } from "@/lib/faqTenantConfig";
import { getCampusTenantKeyForHost, getRequestHost } from "@/lib/faqCampusHostTenantKey";
import {
  isProgrammeCampusUniId,
  programmeCampusXTenantKey,
  programmeUniEnvKey,
} from "@/lib/faqProgrammeCampusUnis";

/**
 * Headers forwarded to the FAQ upstream (same contract as the DYP portal curl: Cookie + Authorization).
 * Campus (`dyp`) on mapped hosts sends `X-Tenant-Key` (`FAQ_CAMPUS_HOST_TENANT_KEYS` or `FAQ_DYP_X_TENANT_KEY`).
 * Programme campus unis use the same TalentEdge cluster with a fixed `X-Tenant-Key` per tenant id.
 * SVU / VISTAS use `portal-server-v2.*`; CUTN uses `portal-server.cutnonline.in`; programme tiles use
 * `prod-campus-portal-server.talentedge.dev`. SVU/CUTN/VISTAS do not set `X-Tenant-Key` here; programme unis do.
 */
export function buildFaqUpstreamHeaders(
  req: Request,
  opts?: { faqTenantId?: FaqTenantId },
): Record<string, string> {
  const out: Record<string, string> = {};

  const cookie = req.headers.get("cookie");
  if (cookie) {
    out.cookie = cookie;
  }

  const incomingAuth = req.headers.get("authorization");
  const envAuth = process.env.FAQ_UPSTREAM_AUTHORIZATION?.trim();
  const raw = incomingAuth || envAuth;
  if (raw) {
    const lower = raw.toLowerCase();
    out.authorization =
      lower.startsWith("bearer ") || lower.startsWith("basic ") ? raw : `Bearer ${raw}`;
  }

  if (opts?.faqTenantId === "dyp") {
    const host = getRequestHost(req);
    const key =
      getCampusTenantKeyForHost(host) || process.env.FAQ_DYP_X_TENANT_KEY?.trim() || null;
    if (key) {
      out["X-Tenant-Key"] = key;
    }
  } else if (opts?.faqTenantId && isProgrammeCampusUniId(opts.faqTenantId)) {
    const ek = programmeUniEnvKey(opts.faqTenantId);
    const rawKey = process.env[`FAQ_${ek}_X_TENANT_KEY`]?.trim();
    out["X-Tenant-Key"] = rawKey || programmeCampusXTenantKey(opts.faqTenantId);
  }

  return out;
}
