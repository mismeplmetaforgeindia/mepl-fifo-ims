"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import { fmtKg } from "@/lib/format";

interface IssueRow {
  id: string;
  issue_date: string | null;
  coil_number: string | null;
  rm_code: string | null;
  machine: string | null;
  issued_qty: number | null;
  shift: string | null;
  operator: string | null;
}

const columns: ColumnDef<IssueRow, unknown>[] = [
  { accessorKey: "issue_date", header: "Issue Date", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "coil_number", header: "Coil Number", cell: (c) => <span className="font-semibold text-metaforge-navy">{String(c.getValue() ?? "")}</span> },
  { accessorKey: "rm_code", header: "RM Code", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "machine", header: "Machine", cell: (c) => String(c.getValue() ?? "—") },
  { accessorKey: "issued_qty", header: "Issued Qty", cell: (c) => (c.getValue() == null ? "—" : fmtKg(c.getValue() as number)), meta: { align: "right" } },
  { accessorKey: "shift", header: "Shift", cell: (c) => String(c.getValue() || "—") },
  { accessorKey: "operator", header: "Operator", cell: (c) => String(c.getValue() ?? "—") },
];

export function IssueTable({ rows }: { rows: IssueRow[] }) {
  return <DataTable columns={columns} data={rows} searchPlaceholder="Search coil, RM, machine…" exportFilename="issue-history" />;
}
