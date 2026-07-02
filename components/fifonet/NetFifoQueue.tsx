"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NetFifoCard } from "./NetFifoCard";
import { AssignRackModal } from "@/components/fifo/AssignRackModal";
import type { FifoNetItem } from "./types";

const MAX = 200;

export function NetFifoQueue({
  rmCode, rmDescription, isAdmin, knownRacks,
}: {
  rmCode: string | null; rmDescription: string | null; isAdmin: boolean; knownRacks: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<FifoNetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<FifoNetItem | null>(null);

  const load = useCallback(async () => {
    if (!rmCode) { setItems([]); setTotal(0); return; }
    setLoading(true);
    const { data, count } = await supabase
      .from("v_fifo_net").select("*", { count: "exact" })
      .eq("rm_code", rmCode).gt("net_raw", 0)
      .order("fifo_sequence", { ascending: true }).limit(MAX);
    // re-rank the visible (active) coils cleanly 1..N, oldest first
    const ranked = ((data as FifoNetItem[]) ?? []).map((it, i) => ({ ...it, fifo_sequence: i + 1 }));
    setItems(ranked);
    setTotal(count ?? ranked.length);
    setLoading(false);
  }, [supabase, rmCode]);

  useEffect(() => { load(); }, [load]);

  // realtime: refresh when locations/lots change (mirrors the FIFO board)
  useEffect(() => {
    const ch = supabase.channel("fifo-net")
      .on("postgres_changes", { event: "*", schema: "public", table: "coil_locations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "fifo_lots" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  if (!rmCode) {
    return <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed bg-white text-sm text-muted-foreground">Select a material to see its net FIFO queue.</div>;
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div><span className="font-semibold text-slate-900">{rmCode}</span>{rmDescription && <span className="ml-2 text-sm text-muted-foreground">{rmDescription}</span>}</div>
        <span className="text-xs text-muted-foreground">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : total > items.length ? `Oldest ${items.length} of ${total}` : `${items.length} lots`}</span>
      </div>
      <div className="max-h-[70vh] space-y-2 overflow-auto p-3">
        {!loading && items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No active lots for this material.</p>
        ) : (
          items.map((i) => <NetFifoCard key={i.id} item={i} supabase={supabase} isAdmin={isAdmin} onAddRack={setAssigning} />)
        )}
      </div>

      {assigning && (
        <AssignRackModal item={assigning} knownRacks={knownRacks}
          onClose={() => setAssigning(null)} onAssigned={load} />
      )}
    </div>
  );
}
