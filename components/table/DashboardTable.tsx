"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import { fmtInt } from "@/lib/format";
import type { DashboardRow } from "@/types/database";

const n = (v: number | null) => (v === null || v === undefined ? "—" : fmtInt(v));

const columns: ColumnDef<DashboardRow, unknown>[] = [
  { accessorKey: "rm_code", header: "RM Code", cell: (c) => <span className="font-semibold text-metaforge-navy">{String(c.getValue() ?? "")}</span> },
  { accessorKey: "description", header: "Item Description", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "plant", header: "Plant", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "peak_avg_daily", header: "Peak Avg Daily", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "avg_daily", header: "Avg Daily", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "off_avg_daily", header: "OFF Avg Daily", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "lead_time", header: "Lead Time", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "safety_factor", header: "Safety Factor", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "max_level", header: "Max Level", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "opening_stock", header: "10-June", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "inward", header: "Inward", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "outward", header: "Outward", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "khatwad_received", header: "Khatwad Rcvd", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "khatwad_sent", header: "Khatwad Sent", cell: (c) => n(c.getValue() as number), meta: { align: "right" } },
  { accessorKey: "physical_stock", header: "Physical Stock", cell: (c) => n(c.getValue() as number), meta: { align: "right", highlight: true } },
];

export function DashboardTable({ rows }: { rows: DashboardRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search RM code or description…" exportFilename="dashboard" />;
}
