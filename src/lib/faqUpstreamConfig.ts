const DEFAULT_UPSTREAM = "https://iitkgp-portal-server.upgrad.com";

/** Base URL for FAQ API proxy (no trailing slash). Override with FAQ_UPSTREAM_BASE in .env.local / host env. */
export function getFaqUpstreamBase(): string {
  const raw = process.env.FAQ_UPSTREAM_BASE?.trim();
  if (!raw) return DEFAULT_UPSTREAM;
  return raw.replace(/\/+$/, "");
}
