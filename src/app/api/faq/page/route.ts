import { NextResponse } from "next/server";
import { faqUpstreamFetch } from "@/lib/faqUpstreamFetch";
import { getFaqUpstreamBase } from "@/lib/faqUpstreamConfig";
import { buildFaqUpstreamHeaders } from "@/lib/faqUpstreamHeaders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LIVE_BASE = "https://online.iitkgp.ac.in";

function isBlogPageType(pageType: unknown): boolean {
  return String(pageType || "").trim().toLowerCase() === "blog";
}

function buildLiveUrlFromSlug(slug: unknown, pageType?: unknown): string {
  const base = String(process.env.FAQ_LIVE_BASE_URL || DEFAULT_LIVE_BASE)
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

function enrichPagesWithLiveUrl(payload: any): any {
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
    // UI prefers page.liveUrl when present; set a canonical full URL server-side.
    liveUrl: buildLiveUrlFromSlug(p?.pageSlug, p?.pageType ?? p?.type),
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
  const incomingUrl = new URL(req.url);
  const upstreamUrl = new URL(`${getFaqUpstreamBase()}/api/faq/page`);
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
    const enriched = enrichPagesWithLiveUrl(json);
    return NextResponse.json(enriched, {
      status: upstreamRes.status,
      headers: { "content-type": contentType },
    });
  } catch {
    return new NextResponse(text, { status: upstreamRes.status, headers: { "content-type": contentType } });
  }
}

