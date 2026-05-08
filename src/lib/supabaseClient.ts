import { createClient } from "@supabase/supabase-js";

// Placeholders keep `next build` working when env vars are not injected at build time (e.g. Vercel).
// Real requests still need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at runtime.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

