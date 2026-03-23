import { NextResponse } from "next/server";

const UPSTREAM_BASE = "https://dev-iitkgp-portal-server.upgrad.dev";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const incomingUrl = new URL(req.url);
  const upstreamUrl = new URL(`${UPSTREAM_BASE}/api/faq/page`);
  upstreamUrl.search = incomingUrl.search;

  const upstreamRes = await fetch(upstreamUrl.toString(), {
    method: "GET",
    cache: "no-store",
    next: { revalidate: 0 },
    headers: {
      cookie: req.headers.get("cookie") ?? "",
    },
  });

  const contentType = upstreamRes.headers.get("content-type") ?? "application/json";

  // Pass through JSON when possible (our frontend expects JSON).
  try {
    const json = await upstreamRes.json();
    return NextResponse.json(json, { status: upstreamRes.status, headers: { "content-type": contentType } });
  } catch {
    const text = await upstreamRes.text();
    return new NextResponse(text, { status: upstreamRes.status, headers: { "content-type": contentType } });
  }
}

