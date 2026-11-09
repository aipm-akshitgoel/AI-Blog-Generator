import { NextResponse } from "next/server";
import {
  MAX_TRIES,
  getUnlockState,
  isPattern,
  isSession,
  logDrawnPattern,
  saveSharedTry,
} from "@/lib/unlockPatternStore";

export const dynamic = "force-dynamic";

function errorResponse(err: unknown) {
  console.error("[password-attempts] failed:", err);
  const detail = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: "Could not save", detail }, { status: 500 });
}

/** Public: the shared tries and the drawn-pattern log, shown live on /password. */
export async function GET() {
  try {
    const state = await getUnlockState();
    return NextResponse.json(
      {
        used: state.tries.length,
        max: MAX_TRIES,
        tries: state.tries.map((t) => ({ pattern: t.pattern, at: t.at })),
        drawn: state.drawn.map((d) => ({ pattern: d.pattern, at: d.at })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Public, no-login. Body: { session, pattern, action: "drawn" | "save" }.
 * "drawn" logs any completed drawing; "save" uses one of the 3 tries shared by all visitors.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { session, pattern, action } = body ?? {};
  if (!isSession(session) || !isPattern(pattern) || (action !== "drawn" && action !== "save")) {
    return NextResponse.json({ error: "Invalid pattern payload" }, { status: 400 });
  }
  const meta = {
    userAgent: req.headers.get("user-agent"),
    country: req.headers.get("x-vercel-ip-country"),
  };

  try {
    if (action === "drawn") {
      const used = await logDrawnPattern(session, pattern, meta);
      return NextResponse.json({ ok: true, used, max: MAX_TRIES });
    }
    const used = await saveSharedTry(session, pattern, meta);
    if (used === null) {
      return NextResponse.json({ error: "All tries used", used: MAX_TRIES, max: MAX_TRIES }, { status: 409 });
    }
    return NextResponse.json({ ok: true, used, max: MAX_TRIES });
  } catch (err) {
    return errorResponse(err);
  }
}
