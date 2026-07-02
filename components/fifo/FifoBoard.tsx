"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Table2, Search } from "lucide-react";
import { KPICard } from "@/components/layout/KPICard";
import { fmtInt, fmtTonnes } from "@/lib/format";
import { MaterialPicker } from "./MaterialPicker";
import { FifoQueue } from "./FifoQueue";
import type { FifoKpis, FifoRmSummary } from "./types";

export function FifoBoard({ kpis, summary, isAdmin, knownRacks }: { kpis: FifoKpis; summary: FifoRmSummary[]; isAdmin: boolean; knownRacks: string[] }) {
  const [selected, setSelected] = useState<string | null>(summary[0]?.rm_code ?? null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [view, setView] = useState<"picker" | "table">("picker");

  const selectedSummary = useMemo(
    () => summary.find((s) => s.rm_code === selected) ?? null,
    [summary, selected],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-metaforge-navy">FIFO Board</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {fmtInt(kpis.total_lots)} inbound lots · oldest-first by coil date
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Total Lots" value={fmtInt(kpis.total_lots)} subtitle="GRN + transfers" />
        <KPICard label="Available Stock" value={fmtTonnes(kpis.available_kg)} subtitle="across all lots" />
        <KPICard label="Critical Aging" value={fmtInt(kpis.critical_aging)} subtitle="60+ days old" accent="critical" />
        <KPICard label="Pending Rack" value={fmtInt(kpis.pending_rack)} subtitle="no location yet" accent="pending" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-metaforge-navy">
          <input
            type="checkbox"
            className="h-4 w-4 accent-metaforge-amber"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
          />
          Available only (rack assigned)
        </label>

        <div className="flex rounded-lg bg-metaforge-navy/5 p-1">
          <button
            onClick={() => setView("picker")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "picker" ? "bg-metaforge-navy text-white" : "text-metaforge-navy"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Picker
          </button>
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "table" ? "bg-metaforge-navy text-white" : "text-metaforge-navy"
            }`}
          >
            <Table2 className="h-4 w-4" /> Table
          </button>
        </div>
      </div>

      {/* Two-pane board */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <MaterialPicker summary={summary} selected={selected} onSelect={setSelected} />
        <FifoQueue
          rmCode={selected}
          rmDescription={selectedSummary?.description ?? null}
          availableOnly={availableOnly}
          view={view}
          isAdmin={isAdmin}
          knownRacks={knownRacks}
        />
      </div>
    </div>
  );
}
