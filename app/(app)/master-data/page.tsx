import { redirect } from "next/navigation";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/fetch-all";
import { MasterData } from "@/components/master/MasterData";
import type { RmMasterRow } from "@/types/database";

export const dynamic = "force-dynamic";

export interface LocationRow {
  id: string; location_code: string; rack: string | null; bay: string | null;
  row_no: string | null; level_no: string | null; is_active: boolean;
}

export default async function MasterDataPage() {
  const { isAdmin } = await getSessionUser();
  if (!isAdmin) redirect("/dashboard");

  const supabase = await createClient();
  const rm = await fetchAll<RmMasterRow>(supabase, "rm_master", "*", { column: "rm_code", ascending: true });
  const locations = await fetchAll<LocationRow>(supabase, "location_master", "*", { column: "location_code", ascending: true });

  return <MasterData rm={rm} locations={locations} />;
}
