import { NextResponse } from "next/server";
import { faqUpstreamFetch } from "@/lib/faqUpstreamFetch";
import { getFaqUpstreamBase } from "@/lib/faqUpstreamConfig";
import { buildFaqUpstreamHeaders } from "@/lib/faqUpstreamHeaders";
import { getTenantIdFromRequest } from "@/lib/faqTenantAuth";
import { FaqTenantId } from "@/lib/faqTenantConfig";
import { buildDemoFaqPagePayload } from "@/lib/faqDemoData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LIVE_BASES: Record<FaqTenantId, string> = {
  kgp: "https://online.iitkgp.ac.in",
  cu: "https://www.cuonlineedu.in",
  dyp: "https://www.dypatiledu.com",
  demo: "https://online-university.demo",
};

function isBlogPageType(pageType: unknown): boolean {
  return String(pageType || "").trim().toLowerCase() === "blog";
}

function stableStringHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Slug fields vary by upstream (e.g. DYP uses slug_1 / slug_2 / slug_3). */
function resolveLivePathSlug(page: any): string {
  const candidates = [page?.pageSlug, page?.slug, page?.slug_1, page?.slug_2, page?.slug_3];
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const s = c.trim().replace(/^\/+/, "").replace(/\/+$/, "");
    if (s) return s;
  }
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
    const pageType = p?.pageType ?? p?.type;
    return {
      ...p,
      id: resolvePageId(p, idx),
      title: String(p?.title || p?.pageName || "").trim(),
      type: String(p?.type || pageType || "").trim().toLowerCase(),
      // Normalize slug onto pageSlug so clients that only read pageSlug still work (e.g. DYP).
      ...(pathSlug && !String(p?.pageSlug || "").trim() ? { pageSlug: pathSlug } : {}),
      // The static FAQ admin bundle only retains `programId` for prod push payloads.
      // Preserve blog identifiers there so blog pages can still be pushed without
      // rebuilding the external frontend bundle.
      programId: isBlogPageType(pageType)
        ? (p?.blogId ?? p?.programId ?? null)
        : (p?.programId ?? null),
      // Prefer upstream-provided liveUrl; otherwise build a canonical URL by tenant + slug.
      liveUrl:
        typeof p?.liveUrl === "string" && /^https?:\/\//i.test(p.liveUrl)
          ? p.liveUrl
          : buildLiveUrlFromSlug(tenantId, pathSlug || p?.pageSlug, pageType),
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

