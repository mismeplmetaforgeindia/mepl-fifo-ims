"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/table/DataTable";
import { fmtInt } from "@/lib/format";
import { health, daysOfCover, isTracked, HEALTH_META } from "@/lib/inventory";
import type { InvRow } from "./types";

const n = (v: number | null) => (v == null ? "—" : fmtInt(v));

const columns: ColumnDef<InvRow, unknown>[] = [
  { accessorKey: "rm_code", header: "RM Code", cell: (c) => <span className="font-semibold text-slate-900">{String(c.getValue() ?? "")}</span> },
  { accessorKey: "description", header: "Description", cell: (c) => <span className="text-slate-600">{String(c.getValue() ?? "—")}</span> },
  { accessorKey: "peak_avg_daily", header: "Peak/day", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "avg_daily", header: "Avg/day", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "off_avg_daily", header: "Off/day", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "lead_time", header: "Lead Time", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "safety_factor", header: "Safety", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "physical_stock", header: "RM Stock", cell: (c) => n(c.getValue() as number), meta: { align: "right", highlight: true } },
  {
    id: "days", header: "Days",
    accessorFn: (r) => daysOfCover(r) ?? Infinity,
    cell: (c) => { const d = daysOfCover(c.row.original); return d == null ? "—" : d.toFixed(1); },
    meta: { align: "right" },
  },
  { accessorKey: "coil_count", header: "Coils", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  {
    id: "status", header: "Status",
    accessorFn: (r) => health(r),
    cell: (c) => {
      const m = HEALTH_META[health(c.row.original)];
      return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${m.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}</span>;
    },
  },
];

export function LiveInventoryTable({ rows }: { rows: InvRow[] }) {
  const [tab, setTab] = useState<"tracked" | "critical" | "all">("tracked");

  const data = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "tracked") return rows.filter(isTracked);
    return rows.filter((r) => { const h = health(r); return h === "reorder" || h === "stockout"; });
  }, [rows, tab]);

  const TABS = [
    { k: "tracked", label: `Tracked (${rows.filter(isTracked).length})` },
    { k: "critical", label: `Critical (${rows.filter((r) => { const h = health(r); return h === "reorder" || h === "stockout"; }).length})` },
    { k: "all", label: `All (${rows.length})` },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Live Raw Material Inventory</h2>
          <p className="text-xs text-slate-400">Click a column header to sort · Physical Stock highlighted</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === t.k ? "bg-slate-900 text-white" : "text-slate-600"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} data={data} searchPlaceholder="Search RM code or description…" exportFilename="inventory" />
    </div>
  );
}
