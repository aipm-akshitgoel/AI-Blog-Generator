import { NextResponse } from "next/server";
import {
  MAX_TRIES,
  type UnlockState,
  clearSharedTry,
  getUnlockState,
  isPattern,
  isSession,
  logDrawnPattern,
  saveSharedTry,
  usedCount,
} from "@/lib/unlockPatternStore";

export const dynamic = "force-dynamic";

function errorResponse(err: unknown) {
  console.error("[password-attempts] failed:", err);
  const detail = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: "Could not save", detail }, { status: 500 });
}

function publicState(state: UnlockState) {
  return {
    used: usedCount(state),
    max: MAX_TRIES,
    tries: state.tries.map((t) => (t ? { pattern: t.pattern, at: t.at } : null)),
  };
}

/** Public: the 3 shared try slots (patterns included), shown live on /password. */
export async function GET() {
  try {
    const state = await getUnlockState();
    return NextResponse.json(publicState(state), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Public, no-login. Body: { session, action, pattern?, slot? }.
 * - "drawn": log a completed drawing.
 * - "save":  fill try slot `slot` (0-2) with `pattern`.
 * - "clear": empty try slot `slot`.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { session, pattern, action, slot } = body ?? {};
  const validSlot = Number.isInteger(slot) && (slot as number) >= 0 && (slot as number) < MAX_TRIES;
  const ok =
    isSession(session) &&
    ((action === "drawn" && isPattern(pattern)) ||
      (action === "save" && isPattern(pattern) && validSlot) ||
      (action === "clear" && validSlot));
  if (!ok) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const meta = {
    userAgent: req.headers.get("user-agent"),
    country: req.headers.get("x-vercel-ip-country"),
  };

  try {
    if (action === "drawn") {
      await logDrawnPattern(session as string, pattern as number[], meta);
      return NextResponse.json({ ok: true, ...publicState(await getUnlockState()) });
    }
    if (action === "clear") {
      return NextResponse.json({ ok: true, ...publicState(await clearSharedTry(slot as number)) });
    }
    const { accepted, state } = await saveSharedTry(session as string, slot as number, pattern as number[], meta);
    return NextResponse.json(
      accepted ? { ok: true, ...publicState(state) } : { error: "That try is already used", ...publicState(state) },
      { status: accepted ? 200 : 409 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
