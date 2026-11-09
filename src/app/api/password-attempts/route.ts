import { NextResponse } from "next/server";
import { parsePatternPayload, saveUnlockPatterns } from "@/lib/unlockPatternStore";

export const dynamic = "force-dynamic";

/** Public, no-login endpoint used by /password to store every pattern a visitor draws. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parsePatternPayload(body);
  if (!parsed) return NextResponse.json({ error: "Invalid pattern payload" }, { status: 400 });

  try {
    await saveUnlockPatterns(parsed, {
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      country: req.headers.get("x-vercel-ip-country"),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[password-attempts] save failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Could not save", detail }, { status: 500 });
  }
}
