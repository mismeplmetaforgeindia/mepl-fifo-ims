import { createBrowserClient } from "@supabase/ssr";

// Trim to defend against a stray space/newline pasted into .env — those
// turn into invalid fetch headers and throw "Invalid value" at sign-in.
const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

// Browser-side client (Client Components, realtime subscriptions).
export function createClient() {
  return createBrowserClient(URL, ANON);
}
