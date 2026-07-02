import { createClient, getSessionUser } from "@/lib/supabase/server";
import { FifoBoard } from "@/components/fifo/FifoBoard";
import type { FifoRmSummary, FifoKpis } from "@/components/fifo/types";

export const dynamic = "force-dynamic";

export default async function FifoBoardPage() {
  const { isAdmin } = await getSessionUser();
  const supabase = await createClient();
  const [{ data: kpis }, { data: summary }, { data: rackRows }] = await Promise.all([
    supabase.from("v_fifo_kpis").select("*").maybeSingle(),
    supabase.from("v_fifo_rm_summary").select("*").order("total_lots", { ascending: false }),
    supabase.from("coil_locations").select("location_code").not("location_code", "is", null),
  ]);

  const knownRacks = Array.from(
    new Set(((rackRows as { location_code: string }[]) ?? []).map((r) => r.location_code).filter(Boolean)),
  ).sort();

  return (
    <FifoBoard
      kpis={(kpis as FifoKpis) ?? { total_lots: 0, available_kg: 0, critical_aging: 0, pending_rack: 0 }}
      summary={(summary as FifoRmSummary[]) ?? []}
      isAdmin={isAdmin}
      knownRacks={knownRacks}
    />
  );
}
