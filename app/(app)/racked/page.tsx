import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { RackOccupancy } from "@/components/racked/RackOccupancy";
import type { FifoQueueItem } from "@/components/fifo/types";

export const dynamic = "force-dynamic";

export default async function RackedPage() {
  const supabase = await createClient();
  const all = await fetchAll<FifoQueueItem>(supabase, "v_fifo_queue", "*", { column: "location_code", ascending: true });
  const racked = all.filter((r) => r.has_location);
  return <RackOccupancy rows={racked} />;
}
