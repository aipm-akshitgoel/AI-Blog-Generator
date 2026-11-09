import "server-only";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * /password state lives in the owner's Clerk privateMetadata (server-only, never sent to browsers).
 * The 3 saved tries and the log of drawn patterns are shared by every visitor and shown on /password.
 * Clerk caps metadata at ~8KB, so per-session logs are trimmed.
 */
const META_KEY = "unlockPatternsV2";
const LEGACY_KEYS = ["unlockPatterns"];
export const MAX_TRIES = 3;
const MAX_SESSIONS = 6;

export type UnlockTry = { pattern: number[]; at: string; session: string };
export type UnlockSession = {
  session: string;
  firstSeenAt: string;
  updatedAt: string;
  userAgent: string | null;
  country: string | null;
};
export type UnlockDrawn = { pattern: number[]; at: string; session: string };
export type UnlockState = { tries: UnlockTry[]; drawn: UnlockDrawn[]; sessions: Record<string, UnlockSession> };
const MAX_DRAWN = 60;

const SESSION_RE = /^[a-z0-9]{8,40}$/;

export function isPattern(p: unknown): p is number[] {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    p.length <= 9 &&
    p.every((n) => Number.isInteger(n) && n >= 0 && n <= 8) &&
    new Set(p).size === p.length
  );
}

export function isSession(s: unknown): s is string {
  return typeof s === "string" && SESSION_RE.test(s);
}

async function ownerUser() {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ emailAddress: passwordViewerEmails(), limit: 1 });
  if (!data.length) throw new Error("Owner Clerk user not found for PASSWORD_VIEWER_EMAILS");
  return { client, user: data[0] };
}

function readState(meta: Record<string, unknown>): UnlockState {
  const v = meta[META_KEY] as Partial<UnlockState> | undefined;
  return {
    tries: Array.isArray(v?.tries) ? v!.tries : [],
    drawn: Array.isArray(v?.drawn) ? v!.drawn : [],
    sessions: v?.sessions && typeof v.sessions === "object" ? v.sessions : {},
  };
}

async function mutate(fn: (state: UnlockState) => void): Promise<UnlockState> {
  const { client, user } = await ownerUser();
  const meta = { ...((user.privateMetadata ?? {}) as Record<string, unknown>) };
  const state = readState(meta);
  fn(state);
  const latest = Object.values(state.sessions)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_SESSIONS);
  state.sessions = Object.fromEntries(latest.map((s) => [s.session, s]));
  for (const k of LEGACY_KEYS) delete meta[k];
  await client.users.updateUser(user.id, { privateMetadata: { ...meta, [META_KEY]: state } });
  return state;
}

function touchSession(
  state: UnlockState,
  session: string,
  meta: { userAgent: string | null; country: string | null },
): UnlockSession {
  const now = new Date().toISOString();
  const s = (state.sessions[session] ??= {
    session,
    firstSeenAt: now,
    updatedAt: now,
    userAgent: null,
    country: null,
  });
  s.updatedAt = now;
  s.userAgent = meta.userAgent?.slice(0, 120) ?? null;
  s.country = meta.country;
  return s;
}

/** Log one completed drawing (shared log, newest last). */
export async function logDrawnPattern(
  session: string,
  pattern: number[],
  meta: { userAgent: string | null; country: string | null },
): Promise<number> {
  const state = await mutate((st) => {
    touchSession(st, session, meta);
    st.drawn = [...st.drawn, { pattern, at: new Date().toISOString(), session }].slice(-MAX_DRAWN);
  });
  return state.tries.length;
}

/** Use one of the shared tries. Returns null when all tries are already used. */
export async function saveSharedTry(
  session: string,
  pattern: number[],
  meta: { userAgent: string | null; country: string | null },
): Promise<number | null> {
  let accepted = false;
  const state = await mutate((st) => {
    touchSession(st, session, meta);
    if (st.tries.length >= MAX_TRIES) return;
    st.tries.push({ pattern, at: new Date().toISOString(), session });
    accepted = true;
  });
  return accepted ? state.tries.length : null;
}

export async function getUnlockState(): Promise<UnlockState> {
  const { user } = await ownerUser();
  return readState((user.privateMetadata ?? {}) as Record<string, unknown>);
}

/** Owner-only: clear tries and logs so visitors get 3 fresh tries. */
export async function resetUnlockState(): Promise<void> {
  await mutate((st) => {
    st.tries = [];
    st.drawn = [];
    st.sessions = {};
  });
}

/** Emails allowed to view stored patterns. Override with PASSWORD_VIEWER_EMAILS (comma-separated). */
export function passwordViewerEmails(): string[] {
  const raw = process.env.PASSWORD_VIEWER_EMAILS?.trim();
  const list = raw ? raw.split(",") : ["akshitgoel089@gmail.com"];
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}
