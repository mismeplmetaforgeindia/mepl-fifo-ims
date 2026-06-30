import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client (Server Components, Route Handlers, Server Actions).
// cookies() is async in Next.js 15 — must be awaited.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore,
            // middleware refreshes the session cookie on every request.
          }
        },
      },
    }
  );
}

// Convenience: current user + their role from public.users.
export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null as null | string, isAdmin: false };

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "viewer";
  return { user, role, isAdmin: role === "admin" && profile?.is_active !== false };
}
