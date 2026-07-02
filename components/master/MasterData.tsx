"use client";

import { useState } from "react";
import { Database, MapPin } from "lucide-react";
import { RmMaster } from "./RmMaster";
import { LocationMaster } from "./LocationMaster";
import type { RmMasterRow } from "@/types/database";
import type { LocationRow } from "@/app/(app)/master-data/page";

export function MasterData({ rm, locations }: { rm: RmMasterRow[]; locations: LocationRow[] }) {
  const [tab, setTab] = useState<"rm" | "loc">("rm");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-metaforge-navy">Master Data</h1>

      <div className="flex rounded-lg bg-metaforge-navy/5 p-1 w-fit">
        <button onClick={() => setTab("rm")} className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium ${tab === "rm" ? "bg-metaforge-navy text-white" : "text-metaforge-navy"}`}>
          <Database className="h-4 w-4" /> RM Master
        </button>
        <button onClick={() => setTab("loc")} className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium ${tab === "loc" ? "bg-metaforge-navy text-white" : "text-metaforge-navy"}`}>
          <MapPin className="h-4 w-4" /> Location Master
        </button>
      </div>

      {tab === "rm" ? <RmMaster rows={rm} /> : <LocationMaster rows={locations} />}
    </div>
  );
}
