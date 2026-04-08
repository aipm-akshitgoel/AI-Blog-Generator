import { NextResponse } from "next/server";
import { faqUpstreamFetch } from "@/lib/faqUpstreamFetch";
import { getFaqUpstreamBase } from "@/lib/faqUpstreamConfig";
import { buildFaqUpstreamHeaders } from "@/lib/faqUpstreamHeaders";
import {
  extractProdPushCredential,
  stripProdPushCredential,
  validateProdPushCredential,
} from "@/lib/prodPushAuth";

export async function POST(req: Request) {
  const body = await req.json();
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

  const upstreamBody = stripProdPushCredential(body);

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

