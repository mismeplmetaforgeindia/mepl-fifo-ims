import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { isAdmin } = await getSessionUser();
  if (!isAdmin) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: logs }, { data: audits }, { data: users }] = await Promise.all([
    supabase.from("sync_logs").select("*").order("completed_at", { ascending: false, nullsFirst: false }).limit(50),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("users").select("*").order("created_at", { ascending: true }),
  ]);

  return (
    <AdminPanel
      logs={logs ?? []}
      audits={audits ?? []}
      users={users ?? []}
      lastSync={logs?.find((l: any) => l.completed_at)?.completed_at ?? null}
    />
  );
}
