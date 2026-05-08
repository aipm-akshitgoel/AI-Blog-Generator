import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? null;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for server DB client.");
}

const serverKey = supabaseServiceRoleKey || supabaseAnonKey;
if (!serverKey) {
  throw new Error(
    "Missing Supabase server key. Set SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabaseServer = createClient(supabaseUrl, serverKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

