import { NextResponse } from "next/server";
import { faqUpstreamFetch } from "@/lib/faqUpstreamFetch";
import { getFaqUpstreamBase } from "@/lib/faqUpstreamConfig";
import { buildFaqUpstreamHeaders } from "@/lib/faqUpstreamHeaders";
import {
  extractProdPushCredential,
  stripProdPushCredential,
  validateProdPushCredential,
} from "@/lib/prodPushAuth";

function requiresProdPushPassword(body: any): boolean {
  const pageType = String(body?.pageType || "").trim().toLowerCase();
  if (pageType === "intent" || pageType === "blog") return false;
  return true;
}

function normalizeBulkProdPushBody(body: any): any {
  if (!body || typeof body !== "object") return body;

  const pageType = String(body.pageType || "").trim().toLowerCase();
  if (pageType !== "blog") return body;

  const nextBody = { ...body };
  if (nextBody.blogId == null && nextBody.programId != null) {
    nextBody.blogId = nextBody.programId;
    nextBody.programId = null;
  }

  return nextBody;
}

function needsCategoryIdInference(body: any): boolean {
  const categories = body?.categories;
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
  const targetPageType = String(body?.pageType || "").trim().toLowerCase();
  const targetUniversityId = body?.universityId ?? null;
  const targetProgramId = body?.programId ?? null;
  const targetBlogId = body?.blogId ?? null;

  return pages.find((page: any) => {
    const pageType = String(page?.pageType || page?.type || "").trim().toLowerCase();
    if (targetPageType && pageType !== targetPageType) return false;
    if (targetUniversityId != null && page?.universityId !== targetUniversityId) return false;
    if (targetBlogId != null) return page?.blogId === targetBlogId;
    if (targetProgramId != null) return page?.programId === targetProgramId;
    return false;
  }) ?? null;
}

async function inferMissingCategoryIds(body: any, req: Request): Promise<any> {
  if (!needsCategoryIdInference(body)) return body;

  try {
    const upstreamRes = await faqUpstreamFetch(`${getFaqUpstreamBase()}/api/faq/page`, {
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

    const nextCategories = (body.categories as any[]).map((category: any) => {
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

    return { ...body, categories: nextCategories };
  } catch {
    return body;
  }
}

export async function POST(req: Request) {
  const body = await req.json();
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
  const upstreamBody = await inferMissingCategoryIds(normalizedBody, req);

  let upstreamRes: Response;
  try {
    upstreamRes = await faqUpstreamFetch(`${getFaqUpstreamBase()}/api/faq/page/bulk`, {
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

