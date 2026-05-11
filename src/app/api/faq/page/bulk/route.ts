import { NextResponse } from "next/server";
import { faqUpstreamFetch } from "@/lib/faqUpstreamFetch";
import { getFaqUpstreamBase } from "@/lib/faqUpstreamConfig";
import { buildFaqUpstreamHeaders } from "@/lib/faqUpstreamHeaders";
import { getTenantIdFromRequest } from "@/lib/faqTenantAuth";
import {
  extractProdPushCredential,
  stripProdPushCredential,
  validateProdPushCredential,
} from "@/lib/prodPushAuth";
import { isFaqIntentOnlyPageType } from "@/lib/faqPageTypeForSpa";
import type { FaqTenantId } from "@/lib/faqTenantConfig";

function normalizePageTypeForUpstream(raw: unknown): string {
  const pageType = String(raw || "").trim().toLowerCase();
  if (!pageType) return "";
  if (pageType === "blog") return "blog";
  if (pageType === "intent" || pageType === "auxiliary" || pageType === "aux") return "intent";
  if (pageType === "program" || pageType === "specialization") return "program";
  if (pageType === "landing" || pageType === "home" || pageType === "main") return "landing";
  return pageType;
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

function resolveDypBulkPageId(pages: any[], body: any): number | null {
  const targetProgramId = body?.programId;
  const targetBlogId = body?.blogId;
  const targetUni = body?.universityId;
  const rawType = String(body?.pageType || "").trim().toLowerCase();
  const targetType = normalizePageTypeForUpstream(body?.pageType);

  const withinUni = (page: any) =>
    targetUni == null || page?.universityId == null || page.universityId === targetUni;

  if (targetBlogId != null) {
    const hit = pages.find((p) => withinUni(p) && p?.blogId === targetBlogId);
    const id = Number(hit?.pageId ?? hit?.id);
    return Number.isFinite(id) ? id : null;
  }

  if (targetProgramId != null) {
    const hit = pages.find(
      (p) =>
        withinUni(p) &&
        p?.programId === targetProgramId &&
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

async function normalizeDypBulkBody(body: any, req: Request, upstreamBase: string): Promise<any> {
  let next = { ...body };

  if (Array.isArray(next.categories) && !Array.isArray(next.faqCategories)) {
    next.faqCategories = next.categories;
    delete next.categories;
  }

  next.faqCategories = mapFaqIdsForDypUpstream(next.faqCategories) as any;

  const pageId = Number(next.pageId ?? next.pageID);
  if (Number.isFinite(pageId) && pageId > 0) return next;

  try {
    const upstreamRes = await faqUpstreamFetch(`${upstreamBase}/api/faq/page`, {
      method: "GET",
      headers: buildFaqUpstreamHeaders(req),
    });
    const text = await upstreamRes.text();
    const payload = text ? JSON.parse(text) : null;
    const pages = Array.isArray(payload?.data?.pages) ? payload.data.pages : [];
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

function needsCategoryIdInference(body: any): boolean {
  const categories = body?.categories ?? body?.faqCategories;
  if (!Array.isArray(categories)) return false;

  return categories.some((category: any) => {
    if (category?.categoryId != null) return false;
    if (!Array.isArray(category?.faqs)) return false;

    return category.faqs.some((faq: any) => {
      const id = faq?.id;
      return typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id));
    });
  });
}

function findMatchingPage(pages: any[], body: any): any | null {
  const targetPageType = normalizePageTypeForUpstream(body?.pageType);
  const targetUniversityId = body?.universityId ?? null;
  const targetProgramId = body?.programId ?? null;
  const targetBlogId = body?.blogId ?? null;

  return pages.find((page: any) => {
    const pageType = normalizePageTypeForUpstream(page?.pageType || page?.type);
    if (targetPageType && pageType !== targetPageType) return false;
    if (targetUniversityId != null && page?.universityId !== targetUniversityId) return false;
    if (targetBlogId != null) return page?.blogId === targetBlogId;
    if (targetProgramId != null) return page?.programId === targetProgramId;
    const name = String(page?.pageName || page?.title || "").trim().toLowerCase();
    const programEmpty = page?.programId == null || page?.programId === "";
    return programEmpty && name === "home";
  }) ?? null;
}

async function inferMissingCategoryIds(body: any, req: Request, upstreamBase: string): Promise<any> {
  if (!needsCategoryIdInference(body)) return body;

  try {
    const upstreamRes = await faqUpstreamFetch(`${upstreamBase}/api/faq/page`, {
      method: "GET",
      headers: buildFaqUpstreamHeaders(req),
    });

    const text = await upstreamRes.text();
    const payload = text ? JSON.parse(text) : null;
    const pages = Array.isArray(payload?.data?.pages) ? payload.data.pages : [];
    const currentPage = findMatchingPage(pages, body);
    if (!currentPage || !Array.isArray(currentPage?.faqCategories)) return body;

    const faqIdToCategoryId = new Map<number, number>();
    for (const category of currentPage.faqCategories) {
      const categoryId = category?.categoryId;
      if (categoryId == null || !Array.isArray(category?.faqs)) continue;
      for (const faq of category.faqs) {
        const faqId = faq?.id;
        if (typeof faqId === "number") {
          faqIdToCategoryId.set(faqId, categoryId);
        }
      }
    }

    const srcCategories = (body.categories ?? body.faqCategories) as any[];
    const nextCategories = srcCategories.map((category: any) => {
      if (category?.categoryId != null || !Array.isArray(category?.faqs)) return category;

      const matchedCategoryIds = new Set<number>();
      for (const faq of category.faqs) {
        const rawId = faq?.id;
        const faqId =
          typeof rawId === "number"
            ? rawId
            : typeof rawId === "string" && /^\d+$/.test(rawId)
              ? Number(rawId)
              : null;
        if (faqId == null) continue;

        const existingCategoryId = faqIdToCategoryId.get(faqId);
        if (existingCategoryId != null) {
          matchedCategoryIds.add(existingCategoryId);
        }
      }

      if (matchedCategoryIds.size !== 1) return category;
      const [categoryId] = [...matchedCategoryIds];
      return { ...category, categoryId };
    });

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

  const upstreamBase = getFaqUpstreamBase(tenantId);
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
  const withCategories = await inferMissingCategoryIds(normalizedBody, req, upstreamBase);
  const upstreamBody =
    tenantId === "dyp" ? await normalizeDypBulkBody(withCategories, req, upstreamBase) : withCategories;

  let upstreamRes: Response;
  try {
    upstreamRes = await faqUpstreamFetch(`${upstreamBase}/api/faq/page/bulk`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...buildFaqUpstreamHeaders(req),
      },
      body: JSON.stringify(upstreamBody),
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        error: aborted ? "Upstream timeout" : "Upstream request failed",
      },
      { status: aborted ? 504 : 502 },
    );
  }

  const contentType = upstreamRes.headers.get("content-type") ?? "application/json";
  const text = await upstreamRes.text();

  try {
    const json = text ? JSON.parse(text) : null;
    return NextResponse.json(json, { status: upstreamRes.status, headers: { "content-type": contentType } });
  } catch {
    return new NextResponse(text, { status: upstreamRes.status, headers: { "content-type": contentType } });
  }
}

