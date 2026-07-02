"use client";

import { fmtKg } from "@/lib/format";
import type { ActivityEvent } from "./types";

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Latest Activity</h2>
        <p className="text-xs text-slate-400">Last {events.length} events</p>
      </div>
      <div className="max-h-[74vh] space-y-2 overflow-auto pr-1">
        {events.map((e, i) => {
          const out = e.qty < 0;
          return (
            <div key={i} className={`rounded-lg border border-l-4 bg-white p-2.5 ${out ? "border-l-red-500" : "border-l-green-500"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${out ? "text-red-600" : "text-green-600"}`}>
                  {e.type === "issue" ? "Issue" : "GRN Inward"}
                </span>
                <span className="text-[10px] text-slate-400">{e.date}</span>
              </div>
              <p className={`text-sm font-bold tabular-nums ${out ? "text-red-600" : "text-green-600"}`}>
                {out ? "" : "+"}{fmtKg(e.qty)} <span className="font-medium text-slate-700">· {e.rm ?? "—"}</span>
              </p>
              <p className="truncate text-[11px] text-slate-400">{e.coil} {e.ref ? `→ ${e.ref}` : ""}</p>
            </div>
          );
        })}
        {events.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No recent activity.</p>}
      </div>
    </div>
  );
}
