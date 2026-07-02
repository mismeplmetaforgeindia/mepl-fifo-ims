"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fmtInt, fmtKg } from "@/lib/format";
import type { FifoRmSummary } from "./types";

export function MaterialPicker({
  summary,
  selected,
  onSelect,
}: {
  summary: FifoRmSummary[];
  selected: string | null;
  onSelect: (rm: string) => void;
}) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return summary;
    return summary.filter(
      (s) =>
        s.rm_code.toLowerCase().includes(needle) ||
        (s.description ?? "").toLowerCase().includes(needle),
    );
  }, [summary, q]);

  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search RM code…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto p-2">
        {rows.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">No materials match.</p>
        )}
        {rows.map((s) => {
          const active = s.rm_code === selected;
          return (
            <button
              key={s.rm_code}
              onClick={() => onSelect(s.rm_code)}
              className={`mb-1 w-full rounded-lg border-l-4 px-3 py-2.5 text-left transition-colors ${
                active
                  ? "border-l-metaforge-navy bg-metaforge-navy/5"
                  : "border-l-transparent hover:bg-slate-50"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-metaforge-navy">{s.rm_code}</span>
                <span className="shrink-0 text-sm font-medium text-metaforge-navy">
                  {fmtKg(s.total_weight)}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {s.description ?? "—"}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {fmtInt(s.total_lots)} lots
                {s.no_rack > 0 && <span className="text-fifo-aging"> · {fmtInt(s.no_rack)} no-rack</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
