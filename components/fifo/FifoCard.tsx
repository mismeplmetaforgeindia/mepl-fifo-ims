"use client";

import { MapPin, Plus } from "lucide-react";
import { ageBorderClass, ageTextClass } from "@/lib/fifo/aging";
import { fmtKg } from "@/lib/format";
import type { FifoQueueItem } from "./types";

function seqColor(seq: number): string {
  if (seq === 1) return "bg-fifo-fresh";
  if (seq === 2) return "bg-fifo-aging";
  if (seq === 3) return "bg-orange-500";
  return "bg-slate-400";
}

export function FifoCard({ item, isAdmin, onAddRack }: { item: FifoQueueItem; isAdmin?: boolean; onAddRack?: (i: FifoQueueItem) => void }) {
  const isNext = item.fifo_sequence === 1;
  const border = ageBorderClass(item.age_days, item.has_location);
  const tint = isNext && item.has_location ? "bg-fifo-fresh/5" : "bg-white";

  return (
    <div className={`flex gap-3 rounded-xl border-l-4 border-y border-r ${border} ${tint} p-3`}>
      {/* sequence circle */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${seqColor(
          item.fifo_sequence,
        )}`}
      >
        {item.fifo_sequence}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* location pill or add-rack */}
          {item.has_location ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              <MapPin className="h-3 w-3" />
              {item.location_code ?? item.rack}
            </span>
          ) : isAdmin && onAddRack ? (
            <button
              onClick={() => onAddRack(item)}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:border-metaforge-amber hover:text-metaforge-navy"
            >
              <Plus className="h-3 w-3" /> Add rack
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-400">
              <Plus className="h-3 w-3" /> No rack
            </span>
          )}

          {/* heat / transfer badge */}
          {item.source === "transfer" ? (
            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
              PLANT 1→2
            </span>
          ) : (
            item.heat_number && (
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                {item.heat_number}
              </span>
            )
          )}

          {isNext && (
            <span className="ml-auto rounded-md bg-fifo-fresh px-2 py-0.5 text-xs font-bold text-white">
              USE NEXT
            </span>
          )}
        </div>

        <div className="mt-1.5 font-semibold text-metaforge-navy">{item.coil_number}</div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
          <span className="text-muted-foreground">{item.received_date}</span>
          <span className={ageTextClass(item.age_days)}>· {item.age_days}d old</span>
          <span className="ml-auto font-semibold text-metaforge-navy">
            {fmtKg(item.weight_available)} avail
          </span>
        </div>
      </div>
    </div>
  );
}
