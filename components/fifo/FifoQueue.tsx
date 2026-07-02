"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FifoCard } from "./FifoCard";
import { FifoTable } from "./FifoTable";
import { AssignRackModal } from "./AssignRackModal";
import type { FifoQueueItem } from "./types";

const MAX_CARDS = 200; // oldest-first, so the FIFO-relevant lots are always shown

export function FifoQueue({
  rmCode,
  rmDescription,
  availableOnly,
  view,
  isAdmin,
  knownRacks,
}: {
  rmCode: string | null;
  rmDescription: string | null;
  availableOnly: boolean;
  view: "picker" | "table";
  isAdmin: boolean;
  knownRacks: string[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<FifoQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<FifoQueueItem | null>(null);

  const load = useCallback(async () => {
    if (!rmCode) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("v_fifo_queue")
      .select("*", { count: "exact" })
      .eq("rm_code", rmCode)
      .order("fifo_sequence", { ascending: true })
      .limit(MAX_CARDS);
    if (availableOnly) query = query.eq("has_location", true);

    const { data, count } = await query;
    setItems((data as FifoQueueItem[]) ?? []);
    setTotal(count ?? (data?.length ?? 0));
    setLoading(false);
  }, [supabase, rmCode, availableOnly]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refetch when the underlying lots / locations change.
  useEffect(() => {
    const channel = supabase
      .channel("fifo-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "fifo_lots" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "coil_locations" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  if (!rmCode) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed bg-white text-sm text-muted-foreground">
        Select a material on the left to see its FIFO queue.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <span className="font-semibold text-metaforge-navy">{rmCode}</span>
          {rmDescription && (
            <span className="ml-2 text-sm text-muted-foreground">{rmDescription}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : total > items.length ? (
            `Showing oldest ${items.length} of ${total}`
          ) : (
            `${items.length} lots`
          )}
        </span>
      </div>

      <div className="max-h-[70vh] overflow-auto p-3">
        {!loading && items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No lots{availableOnly ? " with a rack assigned" : ""} for this material.
          </p>
        ) : view === "table" ? (
          <FifoTable items={items} />
        ) : (
          <div className="space-y-2">
            {items.map((i) => (
              <FifoCard key={i.id} item={i} isAdmin={isAdmin} onAddRack={setAssigning} />
            ))}
          </div>
        )}
      </div>

      {assigning && (
        <AssignRackModal
          item={assigning}
          knownRacks={knownRacks}
          onClose={() => setAssigning(null)}
          onAssigned={load}
        />
      )}
    </div>
  );
}
