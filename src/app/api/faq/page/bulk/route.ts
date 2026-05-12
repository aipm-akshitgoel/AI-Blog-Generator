import { NextResponse } from "next/server";
import { faqUpstreamFetch } from "@/lib/faqUpstreamFetch";
import { getFaqUpstreamBaseForRequest, getFaqUpstreamBaseEnvVarName } from "@/lib/faqUpstreamConfig";
import { buildFaqUpstreamHeaders } from "@/lib/faqUpstreamHeaders";
import { getTenantIdFromRequest } from "@/lib/faqTenantAuth";
import { getRequestHost, isCampusOnlyFaqHost } from "@/lib/faqCampusHostTenantKey";
import { isProgrammeCampusUniId } from "@/lib/faqProgrammeCampusUnis";
import {
  extractProdPushCredential,
  stripProdPushCredential,
  validateProdPushCredential,
} from "@/lib/prodPushAuth";
import { isFaqIntentOnlyPageType } from "@/lib/faqPageTypeForSpa";
import type { FaqTenantId } from "@/lib/faqTenantConfig";

/** Upstream portal-v2 often returns `error: { message, code }`. The FAQ SPA renders `error` as text — objects cause React #31. */
function flattenPortalErrorObject(errObj: Record<string, unknown>): string {
  const m = errObj.message;
  const c = errObj.code;
  const parts: string[] = [];
  if (typeof m === "string" && m.trim()) parts.push(m.trim());
  if (c != null && String(c).trim()) parts.push(`(${String(c).trim()})`);
  for (const key of ["details", "detail", "description", "reason", "cause", "errors"] as const) {
    const v = errObj[key];
    if (v == null) continue;
    try {
      const s = typeof v === "string" ? v : JSON.stringify(v);
      if (s && s !== "{}" && s !== "[]") parts.push(s.length > 600 ? `${s.slice(0, 600)}…` : s);
    } catch {
      /* ignore */
    }
  }
  return parts.length > 0 ? parts.join(" — ") : JSON.stringify(errObj);
}

function sanitizeUpstreamBulkJson(json: unknown): Record<string, unknown> {
  if (json == null || typeof json !== "object") {
    return { success: false, error: "Empty or invalid FAQ bulk response." };
  }
  const o = { ...(json as Record<string, unknown>) };
  const errVal = o.error;
  if (errVal != null && typeof errVal !== "string") {
    if (typeof errVal === "object" && errVal !== null) {
      o.error = flattenPortalErrorObject(errVal as Record<string, unknown>);
    } else {
      try {
        o.error = JSON.stringify(errVal);
      } catch {
        o.error = "Upstream returned an error.";
      }
    }
  }
  return o;
}

function normalizePageTypeForUpstream(raw: unknown): string {
  const pageType = String(raw || "").trim().toLowerCase();
  if (!pageType) return "";
  if (pageType === "blog") return "blog";
  if (pageType === "intent" || pageType === "auxiliary" || pageType === "aux") return "intent";
  if (pageType === "program" || pageType === "specialization") return "program";
  if (pageType === "landing" || pageType === "home" || pageType === "main") return "landing";
  return pageType;
}

/** Portal v2 stacks (DYP-style bulk); campus `dyp` uses the same shape. */
function usesPortalV2BulkNormalization(tenantId: FaqTenantId): boolean {
  return (
    tenantId === "dyp" ||
    isProgrammeCampusUniId(tenantId) ||
    tenantId === "svu" ||
    tenantId === "cutn" ||
    tenantId === "vistas"
  );
}

function bulkPublishPageIdMissing(body: unknown): boolean {
  if (!body || typeof body !== "object") return true;
  const b = body as Record<string, unknown>;
  const raw = b.pageId ?? b.pageID;
  if (raw == null) return true;
  if (typeof raw === "number") return !Number.isFinite(raw) || raw <= 0;
  if (typeof raw === "string") return !raw.trim();
  return false;
}

/** DYP bulk expects `faqCategories` + `pageId`; SPA sends `categories` and often omits `pageId`. */
function mapFaqIdsForDypUpstream(faqCategories: unknown): unknown {
  if (!Array.isArray(faqCategories)) return faqCategories;
  return faqCategories.map((cat: any) => ({
    ...cat,
    faqs: Array.isArray(cat?.faqs)
      ? cat.faqs.map((faq: any) => {
          const raw = faq?.id ?? faq?.faqId ?? faq?.faqsID;
          const idNum =
            typeof raw === "number"
              ? raw
              : typeof raw === "string" && /^\d+$/.test(raw)
                ? Number(raw)
                : null;
          if (idNum == null) return faq;
          return { ...faq, id: idNum, faqId: idNum, faqsID: idNum };
        })
      : cat.faqs,
  }));
}

/**
 * Portals that share the DYP-style bulk contract (`pageId` + `faqCategories` with `faqsID` rows),
 * not the KGP/CU shapes. Includes TalentEdge campus (`programme` tiles), DYP brand, SVU/CUTN/VISTAS.
 */
function usesBrandPortalBulkPayload(upstreamBase: string): boolean {
  const u = String(upstreamBase || "");
  return (
    /dypatiledu\.com/i.test(u) ||
    /portal-server-v2\./i.test(u) ||
    /portal-server\.cutnonline\.in/i.test(u) ||
    /prod-campus-portal-server\.talentedge\.dev/i.test(u)
  );
}

function mapFaqRowToBrandPortalBulk(faq: any, index: number): Record<string, unknown> {
  const question = String(faq?.question ?? "").trim();
  const answer = String(faq?.answer ?? "").trim();
  const priority = Number(faq?.priority ?? index + 1) || index + 1;
  const status = String(faq?.status ?? "1");
  const raw = faq?.faqsID ?? faq?.id ?? faq?.faqId;
  const idNum =
    typeof raw === "number" && Number.isFinite(raw) && raw > 0
      ? raw
      : typeof raw === "string" && /^\d+$/.test(String(raw).trim())
        ? Number(String(raw).trim())
        : null;
  const row: Record<string, unknown> = { question, answer, priority, status };
  if (idNum != null) row.faqsID = idNum;
  return row;
}

function mapFaqCategoriesToBrandPortalBulkShape(categories: unknown): unknown[] {
  if (!Array.isArray(categories)) return [];
  return categories.map((cat: any, index: number) => {
    const categoryName = String(cat?.categoryName ?? cat?.faqCategory ?? "").trim();
    const out: Record<string, unknown> = {
      categoryName,
      categoryStatus: String(cat?.categoryStatus ?? "1"),
      order_index:
        Number(cat?.order_index ?? cat?.categoryPriority ?? cat?.orderNo ?? index + 1) || index + 1,
      faqs: Array.isArray(cat?.faqs) ? cat.faqs.map((f: any, i: number) => mapFaqRowToBrandPortalBulk(f, i)) : [],
    };
    const cid = cat?.categoryId;
    if (cid != null && cid !== "") {
      const n =
        typeof cid === "number" && Number.isFinite(cid)
          ? cid
          : typeof cid === "string" && /^\d+$/.test(String(cid).trim())
            ? Number(String(cid).trim())
            : null;
      if (n != null && n > 0) out.categoryId = n;
    }
    return out;
  });
}

function toBrandPortalBulkBody(body: any): { pageId: number; faqCategories: unknown[] } {
  const pageId = Number(body?.pageId ?? body?.pageID);
  const fc = body?.faqCategories ?? body?.categories;
  return {
    pageId: Number.isFinite(pageId) && pageId > 0 ? pageId : NaN,
    faqCategories: mapFaqCategoriesToBrandPortalBulkShape(fc),
  };
}

function parsePositiveCategoryId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * DYP brand (`…dypatiledu.com`) bulk appears to **merge** by `categoryId`: categories omitted from the
 * publish body stay visible on the marketing site. Re-append removed server categories with
 * `categoryStatus: "0"` so the portal can deactivate them.
 */
async function appendBrandPortalRemovedCategories(
  body: any,
  req: Request,
  tenantId: FaqTenantId,
  upstreamBase: string,
): Promise<any> {
  if (!usesBrandPortalBulkPayload(upstreamBase)) return body;
  const clientCats = body?.faqCategories;
  if (!Array.isArray(clientCats)) return body;

  const retained = new Set<number>();
  for (const c of clientCats) {
    const id = parsePositiveCategoryId((c as any)?.categoryId);
    if (id != null) retained.add(id);
  }

  let pages: any[] = [];
  try {
    pages = await fetchPortalPageListForBulk(req, tenantId, upstreamBase);
  } catch {
    return body;
  }
  const serverPage = findMatchingPage(pages, body);
  if (!serverPage || !Array.isArray(serverPage.faqCategories)) return body;

  const extras: any[] = [];
  for (const sc of serverPage.faqCategories) {
    const sid = parsePositiveCategoryId(sc?.categoryId);
    if (sid == null) continue;
    if (retained.has(sid)) continue;
    const status = String(sc?.categoryStatus ?? sc?.category_status ?? "1").trim();
    if (status === "0") continue;
    const categoryName = String(sc?.categoryName ?? sc?.faqCategory ?? "").trim();
    extras.push({
      categoryId: sid,
      categoryName,
      categoryStatus: "0",
      order_index: Number(sc?.order_index ?? sc?.orderNo ?? sc?.categoryPriority ?? 999) || 999,
      faqs: [],
    });
  }

  if (extras.length === 0) return body;
  return { ...body, faqCategories: [...clientCats, ...extras] };
}

function resolveDypBulkPageId(pages: any[], body: any): number | null {
  const targetProgramId = body?.programId;
  const targetBlogId = body?.blogId;
  const targetUni = body?.universityId;
  const rawType = String(body?.pageType || "").trim().toLowerCase();
  const targetType = normalizePageTypeForUpstream(body?.pageType);

  const programMatches = (pageVal: unknown, bodyVal: unknown) => {
    if (bodyVal == null || bodyVal === "") return false;
    if (pageVal == null || pageVal === "") return false;
    if (typeof pageVal === "number" && typeof bodyVal === "number") return pageVal === bodyVal;
    return String(pageVal).trim() === String(bodyVal).trim();
  };

  const withinUni = (page: any) =>
    targetUni == null || page?.universityId == null || String(page.universityId) === String(targetUni);

  if (targetBlogId != null) {
    const hit = pages.find((p) => withinUni(p) && programMatches(p?.blogId, targetBlogId));
    const id = Number(hit?.pageId ?? hit?.id);
    return Number.isFinite(id) ? id : null;
  }

  if (targetProgramId != null) {
    const hit = pages.find(
      (p) =>
        withinUni(p) &&
        programMatches(p?.programId, targetProgramId) &&
        normalizePageTypeForUpstream(p?.pageType || p?.type) === targetType,
    );
    const id = Number(hit?.pageId ?? hit?.id);
    return Number.isFinite(id) ? id : null;
  }

  const homeCandidates = pages.filter((p) => {
    if (!withinUni(p)) return false;
    if (p?.programId != null && p.programId !== "") return false;
    const name = String(p?.pageName || p?.title || "").trim().toLowerCase();
    const ptn = normalizePageTypeForUpstream(p?.pageType || p?.type);
    return name === "home" && (rawType === "home" || ptn === targetType);
  });
  if (homeCandidates.length === 1) {
    const id = Number(homeCandidates[0]?.pageId ?? homeCandidates[0]?.id);
    return Number.isFinite(id) ? id : null;
  }

  const loose = pages.find(
    (p) => withinUni(p) && normalizePageTypeForUpstream(p?.pageType || p?.type) === targetType,
  );
  const id = Number(loose?.pageId ?? loose?.id);
  return Number.isFinite(id) ? id : null;
}

/** Same alternate shapes as GET `/api/faq/page` — portal v2 may omit `data.pages`. */
function extractPagesFromFaqPayload(payload: any): any[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload.data;
  const fromData = Array.isArray(data?.pages) ? data.pages : null;
  const fromRoot = Array.isArray((payload as any).pages) ? (payload as any).pages : null;
  const nested =
    data?.result != null && typeof data.result === "object" && Array.isArray((data.result as any).pages)
      ? (data.result as any).pages
      : null;
  return fromData ?? fromRoot ?? nested ?? [];
}

/**
 * Portal page list for bulk `pageId` / category inference (same shapes as `extractPagesFromFaqPayload`).
 * Uses the portal only — do not `fetch` this app's `/api/faq/page` from here: same-origin calls from a
 * route handler can deadlock or flake under `next dev`, which then breaks prod push with upstream 500s.
 */
async function fetchPortalPageListForBulk(req: Request, tenantId: FaqTenantId, upstreamBase: string): Promise<any[]> {
  try {
    const upstreamRes = await faqUpstreamFetch(`${upstreamBase}/api/faq/page`, {
      method: "GET",
      headers: buildFaqUpstreamHeaders(req, { faqTenantId: tenantId }),
    });
    const text = await upstreamRes.text();
    const payload = text ? JSON.parse(text) : null;
    return extractPagesFromFaqPayload(payload);
  } catch {
    return [];
  }
}

async function normalizeDypBulkBody(body: any, req: Request, upstreamBase: string, tenantId: FaqTenantId): Promise<any> {
  let next = { ...body };

  if (Array.isArray(next.categories) && !Array.isArray(next.faqCategories)) {
    next.faqCategories = next.categories;
    delete next.categories;
  }

  next.faqCategories = mapFaqIdsForDypUpstream(next.faqCategories) as any;

  const pageId = Number(next.pageId ?? next.pageID);
  if (Number.isFinite(pageId) && pageId > 0) return next;

  try {
    const pages = await fetchPortalPageListForBulk(req, tenantId, upstreamBase);
    const resolved = resolveDypBulkPageId(pages, next);
    if (resolved != null) next.pageId = resolved;
  } catch {
    /* leave pageId unset */
  }

  return next;
}

function requiresProdPushPassword(body: any): boolean {
  const pageType = String(body?.pageType || "").trim().toLowerCase();
  // Legacy bodies may still send `intent`; only blog/auxiliary skip prod-push password.
  if (pageType === "intent" || isFaqIntentOnlyPageType(pageType)) return false;
  return true;
}

function normalizeBulkProdPushBody(body: any): any {
  if (!body || typeof body !== "object") return body;

  const nextBody = { ...body };
  const pageType = normalizePageTypeForUpstream(nextBody.pageType);
  if (pageType) {
    nextBody.pageType = pageType;
  }

  if (pageType === "blog") {
    if (nextBody.blogId == null && nextBody.programId != null) {
      nextBody.blogId = nextBody.programId;
      nextBody.programId = null;
    }
  }

  return nextBody;
}

function categoriesMissingServerCategoryId(body: any): boolean {
  const categories = body?.categories ?? body?.faqCategories;
  if (!Array.isArray(categories)) return false;
  return categories.some((category: any) => category?.categoryId == null && Array.isArray(category?.faqs));
}

function categoryLabelNorm(category: any): string {
  return String(category?.faqCategory ?? category?.categoryName ?? category?.name ?? "")
    .trim()
    .toLowerCase();
}

function findMatchingPage(pages: any[], body: any): any | null {
  const targetPageType = normalizePageTypeForUpstream(body?.pageType);
  const targetUniversityId = body?.universityId ?? null;
  const targetProgramId = body?.programId ?? null;
  const targetBlogId = body?.blogId ?? null;

  return pages.find((page: any) => {
    const pageType = normalizePageTypeForUpstream(page?.pageType || page?.type);
    if (targetPageType && pageType !== targetPageType) return false;
    if (targetUniversityId != null && String(page?.universityId ?? "") !== String(targetUniversityId)) {
      return false;
    }
    if (targetBlogId != null) return String(page?.blogId ?? "") === String(targetBlogId);
    if (targetProgramId != null) return String(page?.programId ?? "") === String(targetProgramId);
    const name = String(page?.pageName || page?.title || "").trim().toLowerCase();
    const programEmpty = page?.programId == null || page?.programId === "";
    return programEmpty && name === "home";
  }) ?? null;
}

function collectServerFaqIds(currentPage: any): Set<number> {
  const ids = new Set<number>();
  if (!Array.isArray(currentPage?.faqCategories)) return ids;
  for (const category of currentPage.faqCategories) {
    if (!Array.isArray(category?.faqs)) continue;
    for (const faq of category.faqs) {
      const raw = faq?.id ?? faq?.faqId ?? faq?.faqsID;
      if (typeof raw === "number" && Number.isFinite(raw)) ids.add(raw);
      else if (typeof raw === "string" && /^\d+$/.test(raw)) ids.add(Number(raw));
    }
  }
  return ids;
}

function stripClientOnlyFaqIds(faqs: any[], serverFaqIds: Set<number>): any[] {
  return faqs.map((faq: any) => {
    if (!faq || typeof faq !== "object") return faq;
    const raw = faq.id ?? faq.faqId ?? faq.faqsID;
    const num =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && /^\d+$/.test(raw)
          ? Number(raw)
          : null;
    if (num == null || !serverFaqIds.has(num)) {
      const { id, faqId, faqsID, ...rest } = faq;
      return rest;
    }
    return faq;
  });
}

async function inferMissingCategoryIds(
  body: any,
  req: Request,
  upstreamBase: string,
  tenantId: FaqTenantId,
): Promise<any> {
  if (!categoriesMissingServerCategoryId(body)) return body;

  try {
    const pages = await fetchPortalPageListForBulk(req, tenantId, upstreamBase);
    const currentPage = findMatchingPage(pages, body);
    if (!currentPage) return body;
    let serverCats = currentPage.faqCategories;
    if (!Array.isArray(serverCats) && serverCats != null && typeof serverCats === "object") {
      serverCats = Object.values(serverCats as Record<string, unknown>).filter(
        (x) => x != null && typeof x === "object",
      );
    }
    if (!Array.isArray(serverCats) || serverCats.length === 0) return body;
    const pageForInfer = { ...currentPage, faqCategories: serverCats };

    const faqIdToCategoryId = new Map<number, number>();
    for (const category of pageForInfer.faqCategories) {
      const categoryId = category?.categoryId;
      if (categoryId == null || !Array.isArray(category?.faqs)) continue;
      for (const faq of category.faqs) {
        const raw = faq?.id ?? faq?.faqId ?? faq?.faqsID;
        const faqId =
          typeof raw === "number"
            ? raw
            : typeof raw === "string" && /^\d+$/.test(raw)
              ? Number(raw)
              : null;
        if (faqId == null || !Number.isFinite(faqId)) continue;
        faqIdToCategoryId.set(faqId, Number(categoryId));
      }
    }

    const serverFaqIds = collectServerFaqIds(pageForInfer);
    const serverCategories = pageForInfer.faqCategories as any[];

    const srcCategories = (body.categories ?? body.faqCategories) as any[];

    const byFaqId = (category: any) => {
      if (category?.categoryId != null || !Array.isArray(category?.faqs)) return category;
      const matchedCategoryIds = new Set<number>();
      for (const faq of category.faqs) {
        const rawId = faq?.id ?? faq?.faqId ?? faq?.faqsID;
        const faqId =
          typeof rawId === "number"
            ? rawId
            : typeof rawId === "string" && /^\d+$/.test(rawId)
              ? Number(rawId)
              : null;
        if (faqId == null) continue;
        const existingCategoryId = faqIdToCategoryId.get(faqId);
        if (existingCategoryId != null) matchedCategoryIds.add(existingCategoryId);
      }
      if (matchedCategoryIds.size !== 1) return category;
      const [categoryId] = [...matchedCategoryIds];
      return { ...category, categoryId };
    };

    const byName = (category: any) => {
      if (category?.categoryId != null || !Array.isArray(category?.faqs)) return category;
      const label = categoryLabelNorm(category);
      if (!label) return category;
      const hit = serverCategories.find((c) => categoryLabelNorm(c) === label && c?.categoryId != null);
      if (!hit) return category;
      return { ...category, categoryId: hit.categoryId };
    };

    const stripUnknown = (category: any) => {
      if (!Array.isArray(category?.faqs)) return category;
      if (category?.categoryId != null) return category;
      return { ...category, faqs: stripClientOnlyFaqIds(category.faqs, serverFaqIds) };
    };

    const nextCategories = srcCategories.map(byFaqId).map(byName).map(stripUnknown);

    const key = Array.isArray(body.categories) ? "categories" : "faqCategories";
    return { ...body, [key]: nextCategories };
  } catch {
    return body;
  }
}

export async function POST(req: Request) {
  const tenantId = getTenantIdFromRequest(req) as FaqTenantId | null;
  if (!tenantId) {
    return NextResponse.json(
      {
        success: false,
        error: "Please sign in to access AI FAQ.",
      },
      { status: 401 },
    );
  }

  const host = getRequestHost(req);
  if (isCampusOnlyFaqHost(host) && tenantId !== "dyp" && !isProgrammeCampusUniId(tenantId)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This domain uses the Campus FAQ portal. Open AI FAQ and sign in with the Campus (DYP) FAQ account.",
      },
      { status: 403 },
    );
  }

  const upstreamBase = getFaqUpstreamBaseForRequest(tenantId, host);
  const body = await req.json();

  if (tenantId === "demo") {
    return NextResponse.json({
      success: true,
      message: "Demo mode: changes accepted in simulation.",
      data: body,
    });
  }

  if (requiresProdPushPassword(body)) {
    const credential = extractProdPushCredential(body);
    const authResult = validateProdPushCredential(credential);

    if (!authResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.status },
      );
    }
  }

  const normalizedBody = normalizeBulkProdPushBody(stripProdPushCredential(body));
  const withCategories = usesPortalV2BulkNormalization(tenantId)
    ? await inferMissingCategoryIds(normalizedBody, req, upstreamBase, tenantId)
    : normalizedBody;
  let upstreamBody = usesPortalV2BulkNormalization(tenantId)
    ? await normalizeDypBulkBody(withCategories, req, upstreamBase, tenantId)
    : withCategories;

  if (usesPortalV2BulkNormalization(tenantId) && usesBrandPortalBulkPayload(upstreamBase)) {
    upstreamBody = await appendBrandPortalRemovedCategories(upstreamBody, req, tenantId, upstreamBase);
    upstreamBody = toBrandPortalBulkBody(upstreamBody);
  }

  if (usesPortalV2BulkNormalization(tenantId) && bulkPublishPageIdMissing(upstreamBody)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing or invalid pageId for FAQ publish — the proxy refused to call the portal to avoid a blank or wrong page. Reload the FAQ app (or refetch pages), then publish again. If it persists, the live portal page list may not match programId/pageType/universityId in the request.",
      },
      { status: 400 },
    );
  }

  let upstreamRes: Response;
  let bodyStr: string;
  try {
    bodyStr = JSON.stringify(upstreamBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid FAQ payload: could not serialize JSON for upstream." },
      { status: 400 },
    );
  }
  try {
    upstreamRes = await faqUpstreamFetch(`${upstreamBase}/api/faq/page/bulk`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...buildFaqUpstreamHeaders(req, { faqTenantId: tenantId }),
      },
      body: bodyStr,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    const envVar = getFaqUpstreamBaseEnvVarName(tenantId);
    const detail =
      e instanceof Error && e.message && !aborted
        ? ` (${e.message})`
        : "";
    const error = aborted
      ? "Upstream timeout"
      : `Upstream request failed${detail}. Target: ${upstreamBase}. If the host is wrong, set ${envVar} in .env.local. If the API needs auth, set FAQ_UPSTREAM_AUTHORIZATION. Ensure this machine can reach the portal (DNS/VPN/firewall).`;
    return NextResponse.json(
      {
        success: false,
        error,
        upstreamBase,
        upstreamEnvVar: envVar,
      },
      { status: aborted ? 504 : 502 },
    );
  }

  const text = await upstreamRes.text();

  let json: unknown = null;
  const trimmed = text?.trim() ?? "";
  if (trimmed) {
    try {
      json = JSON.parse(trimmed);
    } catch {
      json = null;
    }
  }
  if (json == null && upstreamRes.ok) {
    json = { success: true, message: "Upstream returned empty or non-JSON body" };
  }
  if (json == null) {
    return NextResponse.json(
      {
        success: false,
        error: "Upstream bulk FAQ API returned invalid JSON.",
        preview: trimmed.slice(0, 280),
      },
      { status: upstreamRes.status >= 400 ? upstreamRes.status : 502 },
    );
  }

  if (upstreamRes.status >= 500 && process.env.NODE_ENV !== "production") {
    console.error(
      `[faq/page/bulk] upstream HTTP ${upstreamRes.status} tenant=${tenantId} ${upstreamBase}`,
      "\n→ Outbound (trunc):",
      JSON.stringify(upstreamBody).slice(0, 1400),
      "\n← Raw (trunc):",
      trimmed.slice(0, 900),
    );
  }

  return NextResponse.json(sanitizeUpstreamBulkJson(json), {
    status: upstreamRes.status,
    headers: { "content-type": "application/json" },
  });
}

