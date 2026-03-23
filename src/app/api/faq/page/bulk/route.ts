import { NextResponse } from "next/server";

const UPSTREAM_BASE = "https://dev-iitkgp-portal-server.upgrad.dev";

export async function POST(req: Request) {
  const body = await req.json();

  const upstreamRes = await fetch(`${UPSTREAM_BASE}/api/faq/page/bulk`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify(body),
  });

  const contentType = upstreamRes.headers.get("content-type") ?? "application/json";

  try {
    const json = await upstreamRes.json();
    return NextResponse.json(json, { status: upstreamRes.status, headers: { "content-type": contentType } });
  } catch {
    const text = await upstreamRes.text();
    return new NextResponse(text, { status: upstreamRes.status, headers: { "content-type": contentType } });
  }
}

