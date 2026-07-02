import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

// Manual sync trigger from the Admin Panel. Admin-only. Invokes the
// sync-sheets Edge Function with the service-role key (server-side only).
export async function POST() {
  const { isAdmin } = await getSessionUser();
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!base || !key) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${base}/functions/v1/sync-sheets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ trigger: "manual" }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
