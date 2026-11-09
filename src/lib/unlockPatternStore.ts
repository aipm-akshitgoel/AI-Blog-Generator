import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Attempts are kept in the owner's Clerk privateMetadata (server-only, never sent to browsers).
 * Clerk caps metadata at ~8KB, so we keep the most recent sessions and patterns only.
 */
const META_KEY = "unlockPatterns";
const MAX_SESSIONS = 6;
const MAX_KEEP_PER_SESSION = 40;

export type UnlockPatternRecord = {
  session: string;
  saved: number[][];
  drawn: number[][];
  firstSeenAt: string;
  updatedAt: string;
  userAgent: string | null;
  country: string | null;
};

const SESSION_RE = /^[a-z0-9]{8,40}$/;
const MAX_PATTERNS = 60;

function isPattern(p: unknown): p is number[] {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    p.length <= 9 &&
    p.every((n) => Number.isInteger(n) && n >= 0 && n <= 8) &&
    new Set(p).size === p.length
  );
}

export function parsePatternPayload(body: unknown): { session: string; saved: number[][]; drawn: number[][] } | null {
  if (!body || typeof body !== "object") return null;
  const { session, saved, drawn } = body as Record<string, unknown>;
  if (typeof session !== "string" || !SESSION_RE.test(session)) return null;
  if (!Array.isArray(saved) || !Array.isArray(drawn)) return null;
  if (saved.length > MAX_PATTERNS || drawn.length > MAX_PATTERNS) return null;
  if (!saved.every(isPattern) || !drawn.every(isPattern)) return null;
  return { session, saved, drawn };
}

async function ownerUser() {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ emailAddress: passwordViewerEmails(), limit: 1 });
  if (!data.length) throw new Error("Owner Clerk user not found for PASSWORD_VIEWER_EMAILS");
  return { client, user: data[0] };
}

function storedRecords(meta: Record<string, unknown>): Record<string, UnlockPatternRecord> {
  const v = meta[META_KEY];
  return v && typeof v === "object" ? (v as Record<string, UnlockPatternRecord>) : {};
}

export async function saveUnlockPatterns(
  input: { session: string; saved: number[][]; drawn: number[][] },
  meta: { userAgent: string | null; country: string | null },
): Promise<void> {
  const { client, user } = await ownerUser();
  const privateMetadata = (user.privateMetadata ?? {}) as Record<string, unknown>;
  const records = storedRecords(privateMetadata);
  const existing = records[input.session];
  const now = new Date().toISOString();
  const keepLonger = (a: number[][] | undefined, b: number[][]) =>
    (a && a.length > b.length ? a : b).slice(-MAX_KEEP_PER_SESSION);
  records[input.session] = {
    session: input.session,
    saved: keepLonger(existing?.saved, input.saved),
    drawn: keepLonger(existing?.drawn, input.drawn),
    firstSeenAt: existing?.firstSeenAt ?? now,
    updatedAt: now,
    userAgent: meta.userAgent?.slice(0, 120) ?? null,
    country: meta.country,
  };
  const latest = Object.values(records)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_SESSIONS);
  await client.users.updateUser(user.id, {
    privateMetadata: { ...privateMetadata, [META_KEY]: Object.fromEntries(latest.map((r) => [r.session, r])) },
  });
}

export async function listUnlockPatterns(): Promise<UnlockPatternRecord[]> {
  const { user } = await ownerUser();
  return Object.values(storedRecords((user.privateMetadata ?? {}) as Record<string, unknown>)).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** Emails allowed to view stored patterns. Override with PASSWORD_VIEWER_EMAILS (comma-separated). */
export function passwordViewerEmails(): string[] {
  const raw = process.env.PASSWORD_VIEWER_EMAILS?.trim();
  const list = raw ? raw.split(",") : ["contact.akshitgoel@gmail.com"];
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}
