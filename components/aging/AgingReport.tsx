"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/layout/KPICard";
import { fmtInt, fmtKg, fmtTonnes } from "@/lib/format";
import { ageState, type AgeState } from "@/lib/fifo/aging";
import type { FifoQueueItem } from "@/components/fifo/types";

const LABEL: Record<AgeState, string> = { fresh: "Fresh (<30d)", aging: "Aging (30–60d)", critical: "Critical (>60d)" };

export function AgingReport({ rows }: { rows: FifoQueueItem[] }) {
  const [bucket, setBucket] = useState<"all" | AgeState>("critical");
  const [q, setQ] = useState("");

  const withState = useMemo(() => rows.map((r) => ({ ...r, state: ageState(r.age_days) })), [rows]);

  const totals = useMemo(() => {
    const t = { fresh: { c: 0, w: 0 }, aging: { c: 0, w: 0 }, critical: { c: 0, w: 0 } };
    for (const r of withState) { t[r.state].c++; t[r.state].w += Number(r.weight_available ?? 0); }
    return t;
  }, [withState]);

  const byRm = useMemo(() => {
    const m = new Map<string, { rm: string; fresh: number; aging: number; critical: number; total: number }>();
    for (const r of withState) {
      const rm = r.rm_code ?? "—";
      if (!m.has(rm)) m.set(rm, { rm, fresh: 0, aging: 0, critical: 0, total: 0 });
      const g = m.get(rm)!; g[r.state]++; g.total++;
    }
    return [...m.values()].sort((a, b) => b.critical - a.critical || b.total - a.total);
  }, [withState]);

  const detail = useMemo(() => {
    const n = q.trim().toLowerCase();
    return withState
      .filter((r) => (bucket === "all" ? true : r.state === bucket))
      .filter((r) => !n || r.coil_number.toLowerCase().includes(n) || (r.rm_code ?? "").toLowerCase().includes(n))
      .sort((a, b) => b.age_days - a.age_days);
  }, [withState, bucket, q]);

  function exportExcel() {
    const data = detail.map((r) => ({
      "Coil Number": r.coil_number, "RM Code": r.rm_code ?? "", "Heat": r.heat_number ?? "",
      "Received": r.received_date, "Age (days)": r.age_days, "Bucket": LABEL[r.state],
      "Weight (kg)": r.weight_available ?? "", "Location": r.location_code ?? "pending",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aging");
    XLSX.writeFile(wb, `aging-${bucket}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-metaforge-navy">Aging Report</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{fmtInt(rows.length)} lots by age · oldest first</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard label={LABEL.fresh} value={fmtInt(totals.fresh.c)} subtitle={fmtTonnes(totals.fresh.w)} />
        <KPICard label={LABEL.aging} value={fmtInt(totals.aging.c)} subtitle={fmtTonnes(totals.aging.w)} accent="pending" />
        <KPICard label={LABEL.critical} value={fmtInt(totals.critical.c)} subtitle={fmtTonnes(totals.critical.w)} accent="critical" />
      </div>

      {/* by-RM matrix */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">By material</h2>
        <div className="max-h-[40vh] overflow-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">RM</th><th className="px-3 py-2 text-right">Fresh</th><th className="px-3 py-2 text-right">Aging</th><th className="px-3 py-2 text-right">Critical</th><th className="px-3 py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {byRm.map((r) => (
                <tr key={r.rm} className="border-t">
                  <td className="px-3 py-2 font-medium text-metaforge-navy">{r.rm}</td>
                  <td className="px-3 py-2 text-right text-fifo-fresh">{r.fresh || "—"}</td>
                  <td className="px-3 py-2 text-right text-fifo-aging">{r.aging || "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-fifo-critical">{r.critical || "—"}</td>
                  <td className="px-3 py-2 text-right">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* detail */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-metaforge-navy/5 p-1">
            {(["critical", "aging", "fresh", "all"] as const).map((b) => (
              <button key={b} onClick={() => setBucket(b)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${bucket === b ? "bg-metaforge-navy text-white" : "text-metaforge-navy"}`}>
                {b}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coil / RM…" className="w-56 pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4" /> Export Excel</Button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Coil</th><th className="px-3 py-2">RM</th><th className="px-3 py-2">Received</th><th className="px-3 py-2 text-right">Age</th><th className="px-3 py-2 text-right">Weight</th><th className="px-3 py-2">Location</th></tr>
            </thead>
            <tbody>
              {detail.slice(0, 500).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-medium text-metaforge-navy">{r.coil_number}</td>
                  <td className="px-3 py-2">{r.rm_code ?? "—"}</td>
                  <td className="px-3 py-2">{r.received_date}</td>
                  <td className={`px-3 py-2 text-right ${r.state === "fresh" ? "text-muted-foreground" : "text-fifo-critical"}`}>{r.age_days}d</td>
                  <td className="px-3 py-2 text-right">{fmtKg(r.weight_available)}</td>
                  <td className="px-3 py-2">{r.location_code ?? <span className="text-slate-400">pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {detail.length > 500 && <p className="border-t p-3 text-center text-xs text-muted-foreground">Showing first 500 of {fmtInt(detail.length)} — export includes all.</p>}
        </div>
      </div>
    </div>
  );
}
