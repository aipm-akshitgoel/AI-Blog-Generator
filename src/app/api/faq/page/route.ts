import { NextResponse } from "next/server";
import { faqUpstreamFetch } from "@/lib/faqUpstreamFetch";
import { getFaqUpstreamBase } from "@/lib/faqUpstreamConfig";
import { buildFaqUpstreamHeaders } from "@/lib/faqUpstreamHeaders";
import { getTenantIdFromRequest } from "@/lib/faqTenantAuth";
import { FaqTenantId } from "@/lib/faqTenantConfig";
import { buildDemoFaqPagePayload } from "@/lib/faqDemoData";
import { normalizeFaqPageTypeForSpa } from "@/lib/faqPageTypeForSpa";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LIVE_BASES: Record<FaqTenantId, string> = {
  kgp: "https://online.iitkgp.ac.in",
  cu: "https://www.cuonlineedu.in",
  dyp: "https://www.dypatiledu.com",
  demo: "https://online-university.demo",
};

function isBlogPageType(pageType: unknown): boolean {
  return normalizeFaqPageTypeForSpa(pageType) === "blog";
}

function stableStringHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalizePathSegment(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().replace(/^\/+/, "").replace(/\/+$/, "");
}

function pathSegmentCount(path: string): number {
  return path.split("/").filter(Boolean).length;
}

/**
 * DYP (and similar) send path pieces as slug_1 / slug_2 / slug_3 — they must be joined.
 * Previously we took the first non-empty among pageSlug, slug, slug_1… so slug_2/3 were dropped.
 */
function segmentsFromHttpUrl(url: string): number {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).length;
  } catch {
    return 0;
  }
}

/** Join `slugs`, `slugPath`, `pathSegments`, etc. when API sends an array instead of slug_1..3. */
function pathFromSlugArray(page: any): string {
  const raw = page?.slugs ?? page?.slugPath ?? page?.pathSegments ?? page?.slugSegments;
  if (!Array.isArray(raw)) return "";
  const parts = raw
    .map((item: unknown) => {
      if (typeof item === "string") return normalizePathSegment(item);
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return normalizePathSegment(
          o.slug ?? o.value ?? o.segment ?? o.name ?? o.path ?? o.pageSlug ?? "",
        );
      }
      return "";
    })
    .filter(Boolean);
  return parts.join("/");
}

function resolveLivePathSlug(page: any): string {
  const tierSnake = ["slug_1", "slug_2", "slug_3"].map((k) => normalizePathSegment(page?.[k])).filter(Boolean);
  const tierCamel = ["slug1", "slug2", "slug3"].map((k) => normalizePathSegment(page?.[k])).filter(Boolean);
  const tierParts = tierSnake.length > 0 ? tierSnake : tierCamel;
  const fromTiered = tierParts.length > 0 ? tierParts.join("/") : "";
  const fromArray = pathFromSlugArray(page);

  const pageSlug = normalizePathSegment(page?.pageSlug);
  const slug = normalizePathSegment(page?.slug);
  const dottedPath = normalizePathSegment(page?.path ?? page?.urlPath ?? page?.pagePath);

  const pickLongerPath = (a: string, b: string): string => {
    if (!a) return b;
    if (!b) return a;
    if (pathSegmentCount(b) > pathSegmentCount(a)) return b;
    if (pathSegmentCount(a) > pathSegmentCount(b)) return a;
    return a.length >= b.length ? a : b;
  };

  let combined = pickLongerPath(fromTiered, fromArray);
  if (dottedPath.includes("/")) {
    combined = pickLongerPath(combined, dottedPath);
  }

  const extraSlugFields = [
    page?.programSlug,
    page?.specializationSlug,
    page?.courseSlug,
    page?.subPageSlug,
    page?.childSlug,
  ]
    .map((x) => normalizePathSegment(x))
    .filter(Boolean);
  if (extraSlugFields.length > 0) {
    const segs = combined ? combined.split("/").filter(Boolean) : [];
    const seen = new Set(segs.map((s) => s.toLowerCase()));
    for (const p of extraSlugFields) {
      if (seen.has(p.toLowerCase())) continue;
      segs.push(p);
      seen.add(p.toLowerCase());
    }
    combined = segs.join("/");
  }

  if (combined) {
    if (
      pageSlug &&
      pageSlug.startsWith(`${combined}/`) &&
      pathSegmentCount(pageSlug) > pathSegmentCount(combined)
    ) {
      return pageSlug;
    }
    return combined;
  }

  if (pageSlug) return pageSlug;
  if (slug) return slug;
  if (dottedPath) return dottedPath;
  return "";
}

function resolvePageId(page: any, index: number): number {
  const direct = [page?.id, page?.pageId, page?.blogId, page?.programId];
  for (const candidate of direct) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && /^\d+$/.test(candidate)) return Number(candidate);
  }
  const slugKey = resolveLivePathSlug(page) || String(index);
  const key = `${page?.universityId ?? "u"}:${page?.pageType ?? page?.type ?? "t"}:${slugKey}`;
  const hashed = stableStringHash(key);
  return hashed > 0 ? hashed : index + 1;
}

function tenantLiveBaseEnv(tenantId: FaqTenantId): string | undefined {
  switch (tenantId) {
    case "cu":
      return process.env.FAQ_CU_LIVE_BASE_URL;
    case "dyp":
      return process.env.FAQ_DYP_LIVE_BASE_URL;
    case "demo":
      return process.env.FAQ_DEMO_LIVE_BASE_URL;
    case "kgp":
      return process.env.FAQ_KGP_LIVE_BASE_URL;
  }
}

/** Some portals (e.g. DYP) use `categories` or snake_case instead of `faqCategories`. */
function pickCategoryArrayFromPage(page: any): any[] {
  const candidates = [
    page?.faqCategories,
    page?.categories,
    page?.faq_categories,
    page?.FAQCategories,
    page?.faqCategoryList,
    page?.FaqCategories,
  ];
  const nonEmpty = candidates.find((a) => Array.isArray(a) && a.length > 0);
  if (nonEmpty) return nonEmpty;
  const first = candidates.find((a) => Array.isArray(a));
  return first ?? [];
}

/** When FAQs are flat on the page, build categories the SPA can group by (`faqCategory`). */
function synthesizeCategoriesFromFlatFaqs(page: any): any[] {
  const flat =
    page?.faqs ??
    page?.faqList ??
    page?.FAQList ??
    page?.questions ??
    page?.pageFaqs ??
    page?.faq_data;
  if (!Array.isArray(flat) || flat.length === 0) return [];

  const groups = new Map<string, any[]>();
  for (const f of flat) {
    if (!f || typeof f !== "object") continue;
    const labelRaw =
      (f as any).faqCategory ??
      (f as any).categoryName ??
      (f as any).category_name ??
      (f as any).category ??
      (f as any).faq_category ??
      "";
    const label = String(labelRaw).trim() || "General";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(f);
  }

  let idx = 0;
  const out: any[] = [];
  for (const [faqCategory, faqs] of groups) {
    idx += 1;
    const first = faqs[0] as any;
    const categoryId =
      first?.categoryId ?? first?.category_id ?? first?.faqCategoryId ?? idx;
    out.push({
      categoryId,
      categoryName: faqCategory,
      faqCategory,
      categoryStatus: "1",
      order_index: idx,
      faqs,
    });
  }
  return out;
}

function normalizeFaqRow(f: any, index: number): any {
  if (!f || typeof f !== "object") return null;
  const id = f.id ?? f.faqId ?? f.faqsID ?? f.faq_id ?? f.FAQID;
  const question = f.question ?? f.faq_question ?? f.faqQuestion ?? f.title ?? "";
  const answer = f.answer ?? f.faq_answer ?? f.faqAnswer ?? f.description ?? "";
  const orderNo = f.orderNo ?? f.priority ?? f.order_index ?? f.orderIndex ?? index + 1;
  const priority = f.priority ?? f.orderNo ?? orderNo;
  const status = f.status ?? f.faq_status ?? "1";
  return { ...f, id, question, answer, orderNo, priority, status };
}

function normalizeCategoryRow(cat: any, catIndex: number): any {
  const categoryId = cat?.categoryId ?? cat?.category_id ?? cat?.id;
  const categoryName =
    cat?.categoryName ?? cat?.category_name ?? cat?.name ?? cat?.faqCategory ?? `Category ${catIndex + 1}`;
  const faqCategory = cat?.faqCategory ?? categoryName;
  const categoryStatus = cat?.categoryStatus ?? cat?.category_status ?? cat?.status ?? "1";
  const order_index = cat?.order_index ?? cat?.orderIndex ?? cat?.orderNo ?? catIndex + 1;
  const categoryPriority = cat?.categoryPriority ?? cat?.category_priority ?? order_index;

  let faqRows = cat?.faqs ?? cat?.faqList ?? cat?.FAQList ?? cat?.items ?? cat?.questions;
  if (!Array.isArray(faqRows) || faqRows.length === 0) {
    const hasInlineFaq =
      typeof cat?.question === "string" ||
      typeof cat?.answer === "string" ||
      (cat?.faqId != null && (cat?.question != null || cat?.answer != null));
    faqRows = hasInlineFaq ? [cat] : [];
  }

  const faqs = faqRows.map((f: any, i: number) => normalizeFaqRow(f, i)).filter(Boolean);

  return {
    ...cat,
    categoryId,
    categoryName,
    faqCategory,
    categoryStatus,
    categoryPriority,
    order_index,
    faqs,
  };
}

function normalizePageFaqCategories(page: any): any[] {
  const picked = pickCategoryArrayFromPage(page).map((c, i) => normalizeCategoryRow(c, i));
  if (picked.length > 0) return picked;
  return synthesizeCategoriesFromFlatFaqs(page).map((c, i) => normalizeCategoryRow(c, i));
}

/**
 * SPA (`public/ai-faq`) resolves display URL with `pageUrl || liveUrl || …` before `liveBase + pageSlug`.
 * Short upstream `pageUrl` wins over our enriched `liveUrl` unless we align every slot to the canonical URL.
 */
function pickFinalLiveUrl(page: any, tenantId: FaqTenantId, pathSlug: string, pageType: unknown): string {
  const computed = buildLiveUrlFromSlug(
    tenantId,
    pathSlug || normalizePathSegment(page?.pageSlug),
    pageType,
  );
  const upstreamKeys = ["pageUrl", "liveUrl", "pageLiveUrl", "url", "pageLink"] as const;
  let upstream: string | null = null;
  for (const k of upstreamKeys) {
    const v = page?.[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v.trim())) {
      upstream = v.trim();
      break;
    }
  }
  if (!upstream) return computed;

  const sUp = segmentsFromHttpUrl(upstream);
  const sCo = segmentsFromHttpUrl(computed);
  if (sCo > sUp) return computed;
  if (sCo < sUp) return upstream;
  try {
    const pu = new URL(upstream).pathname.replace(/\/+$/, "");
    const pc = new URL(computed).pathname.replace(/\/+$/, "");
    if (pc.length > pu.length && pc.startsWith(`${pu}/`)) return computed;
    if (pu.length > pc.length && pu.startsWith(`${pc}/`)) return upstream;
  } catch {
    /* ignore */
  }
  return upstream;
}

function buildLiveUrlFromSlug(tenantId: FaqTenantId, slug: unknown, pageType?: unknown): string {
  const tenantEnvBase = tenantLiveBaseEnv(tenantId);
  const base = String(tenantEnvBase || process.env.FAQ_LIVE_BASE_URL || DEFAULT_LIVE_BASES[tenantId])
    .trim()
    .replace(/\/+$/, "");
  const cleanSlug = String(slug || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!cleanSlug) return base;
  if (cleanSlug.toLowerCase() === "home") return base;
  const pathPrefix = isBlogPageType(pageType) ? "/blog" : "";
  return `${base}${pathPrefix}/${cleanSlug}`;
}

function enrichPagesWithLiveUrl(payload: any, tenantId: FaqTenantId): any {
  const pages = payload?.data?.pages;
  if (!Array.isArray(pages)) return payload;
  const nextPages = pages.map((p: any, idx: number) => {
    const pathSlug = resolveLivePathSlug(p);
    const rawPageType = p?.pageType ?? p?.type;
    const pageType = normalizeFaqPageTypeForSpa(rawPageType);
    const existingSlug = normalizePathSegment(p?.pageSlug);
    const upgradedSlug =
      pathSlug &&
      (!existingSlug || pathSegmentCount(pathSlug) > pathSegmentCount(existingSlug))
        ? pathSlug
        : existingSlug || pathSlug;
    const finalLiveUrl = pickFinalLiveUrl(p, tenantId, pathSlug, pageType);
    return {
      ...p,
      id: resolvePageId(p, idx),
      title: String(p?.title || p?.pageName || "").trim(),
      type: pageType,
      pageType,
      faqCategories: normalizePageFaqCategories(p),
      // Keep pageSlug aligned with resolved live path when tiered slugs add segments (DYP).
      ...(pathSlug ? { pageSlug: upgradedSlug } : {}),
      // The static FAQ admin bundle only retains `programId` for prod push payloads.
      // Preserve blog identifiers there so blog pages can still be pushed without
      // rebuilding the external frontend bundle.
      programId: isBlogPageType(pageType)
        ? (p?.blogId ?? p?.programId ?? null)
        : (p?.programId ?? null),
      // Match SPA `ne()`: pageUrl is checked before liveUrl — keep all URL fields in sync.
      pageUrl: finalLiveUrl,
      liveUrl: finalLiveUrl,
      pageLiveUrl: finalLiveUrl,
      url: finalLiveUrl,
      pageLink: finalLiveUrl,
    };
  });
  return {
    ...payload,
    data: {
      ...payload.data,
      pages: nextPages,
    },
  };
}

export async function GET(req: Request) {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json(
      {
        success: false,
        error: "Please sign in to access AI FAQ.",
      },
      { status: 401 },
    );
  }

  if (tenantId === "demo") {
    return NextResponse.json(buildDemoFaqPagePayload(), { status: 200 });
  }

  const incomingUrl = new URL(req.url);
  const upstreamUrl = new URL(`${getFaqUpstreamBase(tenantId)}/api/faq/page`);
  upstreamUrl.search = incomingUrl.search;

  let upstreamRes: Response;
  try {
    upstreamRes = await faqUpstreamFetch(upstreamUrl.toString(), {
      method: "GET",
      cache: "no-store",
      next: { revalidate: 0 },
      headers: buildFaqUpstreamHeaders(req),
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
    const enriched = enrichPagesWithLiveUrl(json, tenantId);
    return NextResponse.json(enriched, {
      status: upstreamRes.status,
      headers: { "content-type": contentType },
    });
  } catch {
    return new NextResponse(text, { status: upstreamRes.status, headers: { "content-type": contentType } });
  }
}

