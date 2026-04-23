import { NextResponse } from "next/server";
import { faqUpstreamFetch } from "@/lib/faqUpstreamFetch";
import { getFaqUpstreamBase } from "@/lib/faqUpstreamConfig";
import { buildFaqUpstreamHeaders } from "@/lib/faqUpstreamHeaders";
import { getTenantIdFromRequest } from "@/lib/faqTenantAuth";
import { FaqTenantId } from "@/lib/faqTenantConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LIVE_BASES: Record<FaqTenantId, string> = {
  kgp: "https://online.iitkgp.ac.in",
  cu: "https://www.cuonlineedu.in",
};

function isBlogPageType(pageType: unknown): boolean {
  return String(pageType || "").trim().toLowerCase() === "blog";
}

function buildLiveUrlFromSlug(tenantId: FaqTenantId, slug: unknown, pageType?: unknown): string {
  const tenantEnvBase =
    tenantId === "cu" ? process.env.FAQ_CU_LIVE_BASE_URL : process.env.FAQ_KGP_LIVE_BASE_URL;
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
  const nextPages = pages.map((p: any) => ({
    ...p,
    // The static FAQ admin bundle only retains `programId` for prod push payloads.
    // Preserve blog identifiers there so blog pages can still be pushed without
    // rebuilding the external frontend bundle.
    programId: isBlogPageType(p?.pageType ?? p?.type)
      ? (p?.blogId ?? p?.programId ?? null)
      : (p?.programId ?? null),
    // Prefer upstream-provided liveUrl; otherwise build a canonical URL by tenant + slug.
    liveUrl:
      typeof p?.liveUrl === "string" && /^https?:\/\//i.test(p.liveUrl)
        ? p.liveUrl
        : buildLiveUrlFromSlug(tenantId, p?.pageSlug, p?.pageType ?? p?.type),
  }));
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

