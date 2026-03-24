const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Bounded fetch for FAQ upstream — avoids hanging route handlers when the remote server is down.
 */
export async function faqUpstreamFetch(
  input: string | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: outerSignal, ...rest } = init;
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  outerSignal?.addEventListener("abort", onAbort);
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
    outerSignal?.removeEventListener("abort", onAbort);
  }
}
