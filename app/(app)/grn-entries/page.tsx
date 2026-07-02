import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { GrnTable } from "@/components/table/GrnTable";
import type { GrnEntryRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function GrnEntriesPage() {
  const supabase = await createClient();
  const rows = await fetchAll<GrnEntryRow>(supabase, "grn_entries", "*", { column: "received_date", ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-metaforge-navy">GRN Entries</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Goods received · {rows.length.toLocaleString("en-IN")} coils · newest first
        </p>
      </div>
      <GrnTable rows={rows} />
    </div>
  );
}
