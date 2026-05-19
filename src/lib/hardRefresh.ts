import type { NextRequest } from "next/server";

/** Browser hard reload (Cmd+Shift+R) — not background RSC/data fetches. */
export function isHardDocumentRefresh(req: NextRequest): boolean {
  const cacheControl = (req.headers.get("cache-control") || "").toLowerCase();
  const pragma = (req.headers.get("pragma") || "").toLowerCase();
  const isHardRefreshHint =
    cacheControl.includes("no-cache") || cacheControl.includes("max-age=0") || pragma.includes("no-cache");

  const secFetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  const secFetchMode = (req.headers.get("sec-fetch-mode") || "").toLowerCase();
  const isDocumentNavigation =
    req.method === "GET" &&
    (secFetchDest === "document" || secFetchDest === "iframe") &&
    (secFetchMode === "navigate" || secFetchMode === "nested-navigate");

  return isHardRefreshHint && isDocumentNavigation;
}
