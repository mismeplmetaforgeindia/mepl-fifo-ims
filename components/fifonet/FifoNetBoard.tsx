"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { KPICard } from "@/components/layout/KPICard";
import { Input } from "@/components/ui/input";
import { fmtInt, fmtKg, fmtTonnes } from "@/lib/format";
import { NetFifoQueue } from "./NetFifoQueue";
import type { FifoNetKpis, FifoNetSummary } from "./types";

export function FifoNetBoard({ kpis, summary, isAdmin, knownRacks }: { kpis: FifoNetKpis; summary: FifoNetSummary[]; isAdmin: boolean; knownRacks: string[] }) {
  const [selected, setSelected] = useState<string | null>(summary[0]?.rm_code ?? null);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? summary.filter((s) => s.rm_code.toLowerCase().includes(n) || (s.description ?? "").toLowerCase().includes(n)) : summary;
  }, [summary, q]);
  const sel = summary.find((s) => s.rm_code === selected) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-metaforge-navy">FIFO Board — Net of Issues</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Remaining = GRN weight − issued (matched by coil number) · expand a coil to see its issues
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Total Lots" value={fmtInt(kpis.total_lots)} subtitle="GRN + transfers" />
        <KPICard label="Remaining Stock" value={fmtTonnes(kpis.remaining_kg)} subtitle="net of issues" />
        <KPICard label="Critical Aging" value={fmtInt(kpis.critical_aging)} subtitle="60+ days, has remaining" accent="critical" />
        <KPICard label="Consumed" value={fmtInt(kpis.depleted)} subtitle="fully issued · hidden from board" accent="pending" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* picker */}
        <div className="rounded-xl border bg-white">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search RM code…" className="pl-9" />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto p-2">
            {rows.map((s) => {
              const active = s.rm_code === selected;
              return (
                <button key={s.rm_code} onClick={() => setSelected(s.rm_code)}
                  className={`mb-1 w-full rounded-lg border-l-4 px-3 py-2.5 text-left ${active ? "border-l-metaforge-navy bg-metaforge-navy/5" : "border-l-transparent hover:bg-slate-50"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-metaforge-navy">{s.rm_code}</span>
                    <span className="shrink-0 text-sm font-medium text-metaforge-navy">{fmtKg(s.total_remaining)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.description ?? "—"}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {fmtInt(s.total_lots)} lots
                    {s.depleted > 0 && <span className="text-fifo-critical"> · {fmtInt(s.depleted)} depleted</span>}
                    {s.no_rack > 0 && <span className="text-fifo-aging"> · {fmtInt(s.no_rack)} no-rack</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <NetFifoQueue rmCode={selected} rmDescription={sel?.description ?? null} isAdmin={isAdmin} knownRacks={knownRacks} />
      </div>
    </div>
  );
}
