/**
 * Campus FAQ portal (TalentEdge prod) is multi-tenant: each **mapped** public host sends a fixed
 * `X-Tenant-Key` on upstream `dyp` requests (same stack as Campus FAQ; only host + key change).
 *
 * Example (Campus FAQ `dyp` tile on a mapped host):
 * `GET https://prod-campus-portal-server.talentedge.dev/api/faq/page` with `X-Tenant-Key` from this table.
 * For **programme** tenants (TalentEdge campus unis), pick the matching tile on `/ai-faq` — each sends its own `X-Tenant-Key` (see `faqProgrammeCampusUnis` + `faqUpstreamHeaders`).
 *
 * Rollout: add hostnames here when a domain should show **only** the Campus FAQ (`dyp`) tile (not the full uni list).
 * For **localhost** hub dev (`/ai-faq` as DYP), do **not** add a fake key — the TalentEdge campus API may return
 * `403 Unknown or inactive tenant` for stale keys like `test`. Set `FAQ_DYP_X_TENANT_KEY` in `.env.local` when you
 * need a specific campus tenant from your machine.
 *
 * @see `FAQ_DYP_UPSTREAM_BASE` — overrides both defaults. When unset: brand DYP uses
 * `https://portal-server.dypatiledu.com`; campus `X-Tenant-Key` flows use the TalentEdge cluster.
 */

/** Lowercase hostname (no port) → upstream `X-Tenant-Key` for the shared **Campus FAQ** (`dyp`) tile only. */
export const FAQ_CAMPUS_HOST_TENANT_KEYS: Record<string, string> = {};

export function normalizeRequestHostname(host: string): string {
  return host.trim().toLowerCase().split(":")[0].split("/")[0] || "";
}

export function getRequestHost(req: Request): string {
  // Prefer proxy-provided host; some stacks omit `x-forwarded-host` but set `host` to the public name.
  const headerCandidates = [
    req.headers.get("x-forwarded-host"),
    req.headers.get("x-original-host"),
    req.headers.get("host"),
  ];
  for (const raw of headerCandidates) {
    if (!raw) continue;
    const first = raw.split(",")[0]?.trim() ?? "";
    const normalized = normalizeRequestHostname(first);
    if (normalized) return normalized;
  }
  try {
    return normalizeRequestHostname(new URL(req.url).hostname);
  } catch {
    return "";
  }
}

export function getPublicOrigin(req: Request): string {
  const host = getRequestHost(req);
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}

export function getCampusTenantKeyForHost(host: string): string | null {
  const h = normalizeRequestHostname(host);
  if (!h) return null;
  const key = FAQ_CAMPUS_HOST_TENANT_KEYS[h];
  return typeof key === "string" && key.length > 0 ? key : null;
}

/** Hosts that must use Campus (cookie tenant `dyp`) FAQ, not KGP/CU. Localhost stays multi-tenant for dev. */
export function isCampusOnlyFaqHost(host: string): boolean {
  const h = normalizeRequestHostname(host);
  if (h === "localhost" || h === "127.0.0.1") return false;
  return getCampusTenantKeyForHost(h) != null;
}

function scoreHostForCanonical(h: string): number {
  let s = h.length;
  // Prefer `www.` when both apex and www map to the same tenant key — programme sites often
  // serve the public marketing site on apex while the app (or TLS) lives on www.
  if (!h.startsWith("www.")) s += 10_000;
  return s;
}

function labelFromTenantKey(tenantKey: string): string {
  return tenantKey
    .split("_")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" · ");
}

/**
 * Programme / microsite public origins (localhost excluded). Each uses the same Campus FAQ stack as DYP:
 * only the domain changes; `X-Tenant-Key` is derived from the host.
 */
export function listCampusFaqMicrosites(): Array<{
  tenantKey: string;
  label: string;
  origin: string;
  /** Full URL to the AI FAQ login route on this host. */
  loginUrl: string;
}> {
  const byKey = new Map<string, string>();
  for (const [host, key] of Object.entries(FAQ_CAMPUS_HOST_TENANT_KEYS)) {
    if (host === "localhost") continue;
    const prev = byKey.get(key);
    if (!prev || scoreHostForCanonical(host) < scoreHostForCanonical(prev)) {
      byKey.set(key, host);
    }
  }

  return [...byKey.entries()]
    .map(([tenantKey, host]) => {
      const origin = `https://${host}`;
      return {
        tenantKey,
        label: labelFromTenantKey(tenantKey),
        origin,
        loginUrl: `${origin}/ai-faq`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** One public URL per tenant key for hub / marketing links (excludes localhost). */
export function listCampusFaqPortalLinks(): Array<{ tenantKey: string; label: string; href: string }> {
  return listCampusFaqMicrosites().map((m) => ({
    tenantKey: m.tenantKey,
    label: m.label,
    href: m.loginUrl,
  }));
}
