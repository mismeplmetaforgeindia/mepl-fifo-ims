"use client";

import { Star } from "lucide-react";

export function TopBar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 pl-10 md:pl-0">
        <span className="text-[13px] font-semibold tracking-wide text-slate-700">
          METAFORGE ENGINEERING (I) PVT. LTD.
        </span>
        <span className="hidden text-[13px] text-slate-400 sm:inline">· Nashik, Maharashtra</span>
      </div>
      {isAdmin && (
        <span className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> ADMIN
        </span>
      )}
    </header>
  );
}
