"use client";

import { Star, RefreshCw } from "lucide-react";

// Sync indicator is a placeholder in Phase 1 — it is wired to real
// sync_logs data in Phase 2 (Sync Engine).
export function TopBar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center gap-2 pl-10 md:pl-0">
        <span className="text-sm font-bold text-metaforge-navy">
          METAFORGE ENGINEERING (I) PVT. LTD.
        </span>
        <span className="hidden text-sm text-muted-foreground sm:inline">· Nashik, Maharashtra</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <RefreshCw className="h-3.5 w-3.5" />
          Sync status — connected in Phase 2
        </span>

        {isAdmin && (
          <span className="flex items-center gap-1.5 rounded-full border border-metaforge-gold bg-metaforge-gold/15 px-3 py-1 text-xs font-semibold text-metaforge-navy">
            <Star className="h-3.5 w-3.5 fill-metaforge-gold text-metaforge-gold" />
            ADMIN
          </span>
        )}
      </div>
    </header>
  );
}
