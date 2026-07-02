"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChevronDown, ChevronRight, MapPin, Plus, Loader2 } from "lucide-react";
import { fmtKg } from "@/lib/format";
import { ageBorderClass, ageTextClass } from "@/lib/fifo/aging";
import type { FifoNetItem, IssueTxn } from "./types";

function seqColor(seq: number): string {
  if (seq === 1) return "bg-fifo-fresh";
  if (seq === 2) return "bg-fifo-aging";
  if (seq === 3) return "bg-orange-500";
  return "bg-slate-400";
}

export function NetFifoCard({
  item, supabase, isAdmin, onAddRack,
}: {
  item: FifoNetItem;
  supabase: SupabaseClient;
  isAdmin?: boolean;
  onAddRack?: (i: FifoNetItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [txns, setTxns] = useState<IssueTxn[] | null>(null);
  const [loading, setLoading] = useState(false);

  const isNext = item.fifo_sequence === 1;
  const border = ageBorderClass(item.age_days, item.has_location);
  const tint = isNext && item.has_location ? "bg-fifo-fresh/5" : "bg-white";

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && txns === null && item.issue_count > 0) {
      setLoading(true);
      const { data } = await supabase
        .from("issue_transactions")
        .select("id, issue_date, machine, issued_qty, shift")
        .eq("coil_number", item.coil_number)
        .order("issue_date", { ascending: true });
      setTxns((data as IssueTxn[]) ?? []);
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-xl border-l-4 border-y border-r ${border} ${tint}`}>
      <div className="flex gap-3 p-3">
        {/* sequence circle */}
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${seqColor(item.fifo_sequence)}`}>
          {item.fifo_sequence}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.has_location ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                <MapPin className="h-3 w-3" />{item.location_code ?? item.rack}
              </span>
            ) : isAdmin && onAddRack ? (
              <button onClick={() => onAddRack(item)}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 hover:border-orange-400 hover:text-orange-600">
                <Plus className="h-3 w-3" /> Add rack
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-400">
                <Plus className="h-3 w-3" /> No rack
              </span>
            )}

            {item.source === "transfer" ? (
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">PLANT 1→2</span>
            ) : (
              item.heat_number && <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">{item.heat_number}</span>
            )}

            {isNext && <span className="ml-auto rounded-md bg-fifo-fresh px-2 py-0.5 text-xs font-bold text-white">USE NEXT</span>}
          </div>

          <div className="mt-1.5 font-semibold text-slate-900">{item.coil_number}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
            <span className="text-muted-foreground">{item.received_date}</span>
            <span className={ageTextClass(item.age_days)}>· {item.age_days}d old</span>
            <span className="ml-auto text-right">
              <span className="font-semibold text-slate-900">{fmtKg(item.weight_remaining)} avail</span>
              {item.issue_count > 0 && (
                <span className="ml-1 text-[11px] text-muted-foreground">({fmtKg(item.grn_weight)} − {fmtKg(item.issued_total)})</span>
              )}
            </span>
          </div>

          {item.issue_count > 0 && (
            <button onClick={toggle} className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-slate-700 hover:underline">
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {item.issue_count} issue{item.issue_count > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {open && item.issue_count > 0 && (
        <div className="border-t bg-slate-50 px-3 py-2">
          {loading ? (
            <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> loading issues…</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-1 pr-3">Date</th><th className="py-1 pr-3">Machine</th><th className="py-1 pr-3">Shift</th><th className="py-1 text-right">Issued</th></tr>
              </thead>
              <tbody>
                {(txns ?? []).map((t) => (
                  <tr key={t.id} className="border-t border-slate-200">
                    <td className="py-1 pr-3">{t.issue_date ?? "—"}</td>
                    <td className="py-1 pr-3">{t.machine ?? "—"}</td>
                    <td className="py-1 pr-3">{t.shift || "—"}</td>
                    <td className="py-1 text-right font-medium text-fifo-critical">− {fmtKg(t.issued_qty)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-300 font-semibold text-slate-900">
                  <td className="py-1 pr-3" colSpan={3}>Remaining</td>
                  <td className="py-1 text-right">{fmtKg(item.weight_remaining)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
