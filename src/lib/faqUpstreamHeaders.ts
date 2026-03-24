/**
 * Headers forwarded to the FAQ upstream. Browser cookies + Authorization pass through;
 * optional server-only `FAQ_UPSTREAM_AUTHORIZATION` when the client does not send a Bearer token.
 */
export function buildFaqUpstreamHeaders(req: Request): Record<string, string> {
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

  return out;
}
