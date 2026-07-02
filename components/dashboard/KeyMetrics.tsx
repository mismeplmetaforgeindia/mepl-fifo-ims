"use client";

import { fmtInt, fmtKg, fmtTonnes } from "@/lib/format";

const CARDS = [
  { key: "healthy", label: "Healthy", sub: "Above reorder level", dot: "bg-green-500", bar: "border-l-green-500" },
  { key: "low", label: "Low", sub: "Approaching reorder", dot: "bg-amber-500", bar: "border-l-amber-500" },
  { key: "reorder", label: "Reorder Now", sub: "Below reorder level", dot: "bg-orange-500", bar: "border-l-orange-500" },
  { key: "stockout", label: "Stock Out", sub: "Tracked items at zero", dot: "bg-red-500", bar: "border-l-red-500" },
] as const;

export function KeyMetrics({
  stockOnHand, inward, outward, counts,
}: {
  stockOnHand: number; inward: number; outward: number;
  counts: Record<"healthy" | "low" | "reorder" | "stockout", number>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Key Metrics</h2>
        <p className="text-xs text-slate-400">Stock health at a glance</p>
      </div>

      {/* Stock on hand */}
      <div className="rounded-xl bg-slate-900 p-5 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Stock on hand</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums">
          {fmtInt(stockOnHand)}<span className="ml-1 text-base font-semibold text-slate-300">kg</span>
        </p>
        <p className="text-sm font-medium text-slate-300">{fmtTonnes(stockOnHand)}</p>
        <p className="mt-3 border-t border-white/10 pt-2 text-[11px] text-slate-400">
          Inward {fmtKg(inward)} · Outward {fmtKg(outward)}
        </p>
      </div>

      {/* status cards */}
      {CARDS.map((c) => (
        <div key={c.key} className={`rounded-xl border border-l-4 ${c.bar} bg-white p-4`}>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${c.dot}`} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c.label}</span>
          </div>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{fmtInt(counts[c.key])}</p>
          <p className="text-xs text-slate-400">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
