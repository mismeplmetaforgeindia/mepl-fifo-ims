import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { AgingReport } from "@/components/aging/AgingReport";
import type { FifoQueueItem } from "@/components/fifo/types";

export const dynamic = "force-dynamic";

export default async function AgingPage() {
  const supabase = await createClient();
  const rows = await fetchAll<FifoQueueItem>(supabase, "v_fifo_queue", "*", { column: "received_date", ascending: true });
  return <AgingReport rows={rows} />;
}
