import "server-only";
import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://placeholder.supabase.co";
const buildPlaceholderKey = "build-placeholder-service-role";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fallbackSupabaseUrl;

/** Resolved service_role key — never the anon key (RLS blocks anon after 010_enable_rls.sql). */
export function getSupabaseServiceRoleKey(): string | null {
  const raw =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;
  const key = raw?.trim();
  return key || null;
}

const SERVICE_ROLE_SETUP_HINT =
  "Add SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API → service_role " +
  "to .env.local (local dev) or Vercel → Project → Settings → Environment Variables (production). " +
  "Required for server writes after supabase/010_enable_rls.sql.";

/** Throws if service role is missing at runtime (skipped during `next build`). */
export function requireSupabaseServiceRole(): string {
  const key = getSupabaseServiceRoleKey();
  if (key) return key;
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return buildPlaceholderKey;
  }
  throw new Error(`Missing SUPABASE_SERVICE_ROLE_KEY. ${SERVICE_ROLE_SETUP_HINT}`);
}

export function isRlsPolicyError(message: string): boolean {
  return /row-level security/i.test(message);
}

export function formatSupabaseWriteError(message: string): string {
  if (isRlsPolicyError(message)) {
    return `Database access denied (RLS). The server must use SUPABASE_SERVICE_ROLE_KEY, not the anon key. ${SERVICE_ROLE_SETUP_HINT}`;
  }
  return message;
}

export const supabaseServer = createClient(supabaseUrl, requireSupabaseServiceRole(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

