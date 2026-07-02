"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import { fmtKg } from "@/lib/format";
import type { GrnEntryRow } from "@/types/database";

const columns: ColumnDef<GrnEntryRow, unknown>[] = [
  { accessorKey: "coil_number", header: "Coil Number", cell: (c) => <span className="font-semibold text-metaforge-navy">{String(c.getValue() ?? "")}</span> },
  { accessorKey: "rm_code", header: "RM Code", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "heat_number", header: "Heat", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "weight", header: "Weight", cell: (c) => (c.getValue() == null ? "—" : fmtKg(c.getValue() as number)), meta: { align: "right" } },
  { accessorKey: "supplier", header: "Supplier", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "received_date", header: "Received", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "plant", header: "Plant", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "source", header: "Source", cell: (c) => String(c.getValue() ?? "—") },
];

export function GrnTable({ rows }: { rows: GrnEntryRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search coil, RM, heat, supplier…" exportFilename="grn-entries" />;
}
