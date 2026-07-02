"use client";

import { ageTextClass } from "@/lib/fifo/aging";
import { fmtKg } from "@/lib/format";
import type { FifoQueueItem } from "./types";

export function FifoTable({ items }: { items: FifoQueueItem[] }) {
  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Coil</th>
            <th className="px-3 py-2">Heat</th>
            <th className="px-3 py-2">Received</th>
            <th className="px-3 py-2">Age</th>
            <th className="px-3 py-2 text-right">Weight</th>
            <th className="px-3 py-2">Location</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-3 py-2 font-semibold">{i.fifo_sequence}</td>
              <td className="px-3 py-2 font-medium text-metaforge-navy">{i.coil_number}</td>
              <td className="px-3 py-2">{i.heat_number ?? "—"}</td>
              <td className="px-3 py-2">{i.received_date}</td>
              <td className={`px-3 py-2 ${ageTextClass(i.age_days)}`}>{i.age_days}d</td>
              <td className="px-3 py-2 text-right">{fmtKg(i.weight_available)}</td>
              <td className="px-3 py-2">
                {i.has_location ? (
                  <span className="text-indigo-700">{i.location_code ?? i.rack}</span>
                ) : (
                  <span className="text-slate-400">pending</span>
                )}
              </td>
              <td className="px-3 py-2 capitalize">{i.status.replace("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
