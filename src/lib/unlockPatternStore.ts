import "server-only";
import { supabaseServer } from "@/lib/supabaseServerClient";

/** Private Supabase Storage bucket holding one JSON file per /password visitor session. */
const BUCKET = "unlock-patterns";

export type UnlockPatternRecord = {
  session: string;
  saved: number[][];
  drawn: number[][];
  firstSeenAt: string;
  updatedAt: string;
  userAgent: string | null;
  country: string | null;
};

let bucketReady: Promise<void> | null = null;

function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { error } = await supabaseServer.storage.getBucket(BUCKET);
      if (!error) return;
      const { error: createError } = await supabaseServer.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 65536,
        allowedMimeTypes: ["application/json"],
      });
      if (createError && !/already exists/i.test(createError.message)) {
        throw new Error(`Could not create ${BUCKET} bucket: ${createError.message}`);
      }
    })().catch((err) => {
      bucketReady = null;
      throw err;
    });
  }
  return bucketReady;
}

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

async function readRecord(session: string): Promise<UnlockPatternRecord | null> {
  const { data, error } = await supabaseServer.storage.from(BUCKET).download(`${session}.json`);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as UnlockPatternRecord;
  } catch {
    return null;
  }
}

export async function saveUnlockPatterns(
  input: { session: string; saved: number[][]; drawn: number[][] },
  meta: { userAgent: string | null; country: string | null },
): Promise<void> {
  await ensureBucket();
  const now = new Date().toISOString();
  const existing = await readRecord(input.session);
  const record: UnlockPatternRecord = {
    session: input.session,
    // Never lose a pattern: keep anything stored earlier that the browser no longer sends.
    saved: existing && existing.saved.length > input.saved.length ? existing.saved : input.saved,
    drawn: existing && existing.drawn.length > input.drawn.length ? existing.drawn : input.drawn,
    firstSeenAt: existing?.firstSeenAt ?? now,
    updatedAt: now,
    userAgent: meta.userAgent,
    country: meta.country,
  };
  const { error } = await supabaseServer.storage
    .from(BUCKET)
    .upload(`${input.session}.json`, JSON.stringify(record), { contentType: "application/json", upsert: true });
  if (error) throw new Error(error.message);
}

export async function listUnlockPatterns(): Promise<UnlockPatternRecord[]> {
  await ensureBucket();
  const { data, error } = await supabaseServer.storage.from(BUCKET).list("", { limit: 200 });
  if (error) throw new Error(error.message);
  const files = (data ?? []).filter((f) => f.name.endsWith(".json"));
  const records = await Promise.all(files.map((f) => readRecord(f.name.replace(/\.json$/, ""))));
  return records
    .filter((r): r is UnlockPatternRecord => r !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Emails allowed to view stored patterns. Override with PASSWORD_VIEWER_EMAILS (comma-separated). */
export function passwordViewerEmails(): string[] {
  const raw = process.env.PASSWORD_VIEWER_EMAILS?.trim();
  const list = raw ? raw.split(",") : ["contact.akshitgoel@gmail.com"];
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}
