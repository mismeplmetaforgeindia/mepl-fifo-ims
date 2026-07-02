import { createClient, getSessionUser } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { UnrackedCoils } from "@/components/unracked/UnrackedCoils";
import type { FifoQueueItem } from "@/components/fifo/types";

export const dynamic = "force-dynamic";

export default async function UnrackedPage() {
  const { isAdmin } = await getSessionUser();
  const supabase = await createClient();

  const all = await fetchAll<FifoQueueItem & { hidden?: boolean }>(
    supabase, "v_fifo_queue", "*", { column: "received_date", ascending: true },
  );
  const pending = all.filter((r) => !r.has_location); // includes hidden; client splits

  // issued totals per coil, straight from issue_transactions (exact coil match)
  const issues = await fetchAll<{ coil_number: string | null; issued_qty: number | null }>(
    supabase, "issue_transactions", "coil_number, issued_qty",
  );
  const issued = new Map<string, { total: number; count: number }>();
  for (const i of issues) {
    if (!i.coil_number) continue;
    const m = issued.get(i.coil_number) ?? { total: 0, count: 0 };
    m.total += Number(i.issued_qty ?? 0); m.count += 1;
    issued.set(i.coil_number, m);
  }

  const rows = pending.map((r) => ({
    ...r,
    issued_total: issued.get(r.coil_number)?.total ?? 0,
    issue_count: issued.get(r.coil_number)?.count ?? 0,
  }));

  const { data: rackRows } = await supabase.from("coil_locations").select("location_code").not("location_code", "is", null);
  const knownRacks = Array.from(new Set(((rackRows as { location_code: string }[]) ?? []).map((r) => r.location_code).filter(Boolean))).sort();

  return <UnrackedCoils rows={rows} isAdmin={isAdmin} knownRacks={knownRacks} />;
}
