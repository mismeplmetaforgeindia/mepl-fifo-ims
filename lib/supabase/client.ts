import { createBrowserClient } from "@supabase/ssr";

// Browser-side client (Client Components, realtime subscriptions).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
