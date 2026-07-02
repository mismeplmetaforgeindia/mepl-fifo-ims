import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { IssueTable } from "@/components/table/IssueTable";

export const dynamic = "force-dynamic";

export default async function IssueHistoryPage() {
  const supabase = await createClient();
  const rows = await fetchAll<any>(supabase, "issue_transactions", "*", { column: "issue_date", ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-metaforge-navy">Issue History</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Material issued to machines · {rows.length.toLocaleString("en-IN")} records · newest first
        </p>
      </div>
      <IssueTable rows={rows} />
    </div>
  );
}
