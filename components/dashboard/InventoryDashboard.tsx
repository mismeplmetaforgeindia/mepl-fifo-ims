"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { health } from "@/lib/inventory";
import { KeyMetrics } from "./KeyMetrics";
import { LiveInventoryTable } from "./LiveInventoryTable";
import { ActivityFeed } from "./ActivityFeed";
import type { InvRow, ActivityEvent } from "./types";

export function InventoryDashboard({ rows, activity }: { rows: InvRow[]; activity: ActivityEvent[] }) {
  const router = useRouter();

  const { counts, stockOnHand, inward, outward } = useMemo(() => {
    const counts = { healthy: 0, low: 0, reorder: 0, stockout: 0 } as Record<"healthy" | "low" | "reorder" | "stockout", number>;
    let stockOnHand = 0, inward = 0, outward = 0;
    for (const r of rows) {
      counts[health(r)]++;
      stockOnHand += Number(r.physical_stock ?? 0);
      inward += Number(r.inward ?? 0);
      outward += Number(r.outward ?? 0);
    }
    return { counts, stockOnHand, inward, outward };
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Inventory Health Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Stock levels across {rows.length.toLocaleString("en-IN")} raw materials · Khatwad plant
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[260px_1fr_300px]">
        <KeyMetrics stockOnHand={stockOnHand} inward={inward} outward={outward} counts={counts} />
        <LiveInventoryTable rows={rows} />
        <ActivityFeed events={activity} />
      </div>
    </div>
  );
}
