import { createClient, getSessionUser } from "@/lib/supabase/server";
import { FifoNetBoard } from "@/components/fifonet/FifoNetBoard";
import type { FifoNetKpis, FifoNetSummary } from "@/components/fifonet/types";

export const dynamic = "force-dynamic";

export default async function FifoNetPage() {
  const { isAdmin } = await getSessionUser();
  const supabase = await createClient();
  const [{ data: kpis }, { data: summary }, { data: rackRows }] = await Promise.all([
    supabase.from("v_fifo_net_kpis").select("*").maybeSingle(),
    supabase.from("v_fifo_net_rm_summary").select("*").order("total_remaining", { ascending: false }),
    supabase.from("coil_locations").select("location_code").not("location_code", "is", null),
  ]);
  const knownRacks = Array.from(new Set(((rackRows as { location_code: string }[]) ?? []).map((r) => r.location_code).filter(Boolean))).sort();

  return (
    <FifoNetBoard
      kpis={(kpis as FifoNetKpis) ?? { total_lots: 0, remaining_kg: 0, depleted: 0, critical_aging: 0 }}
      summary={(summary as FifoNetSummary[]) ?? []}
      isAdmin={isAdmin}
      knownRacks={knownRacks}
    />
  );
}
