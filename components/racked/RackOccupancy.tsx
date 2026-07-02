"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Search, MapPin, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtInt, fmtKg } from "@/lib/format";
import { ageTextClass } from "@/lib/fifo/aging";
import type { FifoQueueItem } from "@/components/fifo/types";

interface Rack { code: string; rack: string | null; count: number; weight: number; coils: FifoQueueItem[]; }

export function RackOccupancy({ rows }: { rows: FifoQueueItem[] }) {
  const [q, setQ] = useState("");
  const racks = useMemo(() => {
    const map = new Map<string, Rack>();
    for (const r of rows) {
      const code = r.location_code ?? r.rack ?? "—";
      if (!map.has(code)) map.set(code, { code, rack: r.rack, count: 0, weight: 0, coils: [] });
      const g = map.get(code)!;
      g.count++; g.weight += Number(r.weight_available ?? 0); g.coils.push(r);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  const [selected, setSelected] = useState<string | null>(racks[0]?.code ?? null);
  const filteredRacks = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? racks.filter((r) => r.code.toLowerCase().includes(n)) : racks;
  }, [racks, q]);
  const current = racks.find((r) => r.code === selected) ?? null;

  function exportExcel() {
    if (!current) return;
    const data = current.coils.map((c) => ({
      "Coil Number": c.coil_number, "RM Code": c.rm_code ?? "", "Heat": c.heat_number ?? "",
      "Received": c.received_date, "Age (days)": c.age_days, "Weight (kg)": c.weight_available ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, current.code);
    XLSX.writeFile(wb, `rack-${current.code}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-metaforge-navy">Rack Occupancy</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {fmtInt(racks.length)} racks in use · {fmtInt(rows.length)} coils placed
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* rack list */}
        <div className="rounded-xl border bg-white">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rack…" className="pl-9" />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-auto p-2">
            {filteredRacks.map((r) => {
              const active = r.code === selected;
              return (
                <button key={r.code} onClick={() => setSelected(r.code)}
                  className={`mb-1 w-full rounded-lg border-l-4 px-3 py-2.5 text-left ${active ? "border-l-metaforge-navy bg-metaforge-navy/5" : "border-l-transparent hover:bg-slate-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 font-semibold text-metaforge-navy">
                      <MapPin className="h-3.5 w-3.5" /> {r.code}
                    </span>
                    <span className="text-sm font-medium text-metaforge-navy">{fmtInt(r.count)} coils</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{fmtKg(r.weight)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* rack detail */}
        <div className="rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <span className="font-semibold text-metaforge-navy">{current?.code ?? "—"}</span>
              {current && <span className="ml-2 text-sm text-muted-foreground">{fmtInt(current.count)} coils · {fmtKg(current.weight)}</span>}
            </div>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={!current}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Coil</th><th className="px-3 py-2">RM</th><th className="px-3 py-2">Heat</th>
                  <th className="px-3 py-2">Received</th><th className="px-3 py-2">Age</th><th className="px-3 py-2 text-right">Weight</th>
                </tr>
              </thead>
              <tbody>
                {current?.coils.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2 font-medium text-metaforge-navy">{c.coil_number}</td>
                    <td className="px-3 py-2">{c.rm_code ?? "—"}</td>
                    <td className="px-3 py-2">{c.heat_number ?? "—"}</td>
                    <td className="px-3 py-2">{c.received_date}</td>
                    <td className={`px-3 py-2 ${ageTextClass(c.age_days)}`}>{c.age_days}d</td>
                    <td className="px-3 py-2 text-right">{fmtKg(c.weight_available)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
