import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { InventoryDashboard } from "@/components/dashboard/InventoryDashboard";
import type { DashboardRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [rows, summaryRes, issuesRes, grnRes] = await Promise.all([
    fetchAll<DashboardRow>(supabase, "dashboard_data", "*", { column: "physical_stock", ascending: false }),
    supabase.from("v_fifo_rm_summary").select("rm_code, total_lots"),
    supabase.from("issue_transactions").select("coil_number, rm_code, machine, issued_qty, issue_date").order("issue_date", { ascending: false }).limit(12),
    supabase.from("grn_entries").select("coil_number, rm_code, supplier, weight, received_date").order("received_date", { ascending: false }).limit(12),
  ]);

  const coilMap = new Map<string, number>();
  (summaryRes.data ?? []).forEach((s: { rm_code: string; total_lots: number }) => coilMap.set(s.rm_code, s.total_lots));
  const merged = rows.map((r) => ({ ...r, coil_count: coilMap.get(r.rm_code) ?? 0 }));

  const activity = [
    ...((issuesRes.data ?? []).map((i: { issue_date: string | null; rm_code: string | null; coil_number: string | null; machine: string | null; issued_qty: number | null }) =>
      ({ type: "issue" as const, date: i.issue_date, rm: i.rm_code, coil: i.coil_number, ref: i.machine, qty: -(Number(i.issued_qty ?? 0)) }))),
    ...((grnRes.data ?? []).map((g: { received_date: string | null; rm_code: string | null; coil_number: string | null; supplier: string | null; weight: number | null }) =>
      ({ type: "grn" as const, date: g.received_date, rm: g.rm_code, coil: g.coil_number, ref: g.supplier, qty: Number(g.weight ?? 0) }))),
  ].filter((e) => e.date).sort((a, b) => ((a.date! < b.date!) ? 1 : -1)).slice(0, 15);

  return <InventoryDashboard rows={merged} activity={activity} />;
}
