import { createClient } from "@supabase/supabase-js";

// Service-role client for admin mutations + audit writes (server-only).
// Bypasses RLS, so every caller MUST verify isAdmin() first.
const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SERVICE = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

export function createServiceClient() {
  return createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
