"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const { user, isAdmin } = await getSessionUser();
  if (!user || !isAdmin) throw new Error("Admin access required");
  return user;
}

// Best-effort write to the Racked tab. Never throws — returns ok flag so the
// UI can offer a retry. The local assignment stands regardless (LWW + audit).
async function writeBackRack(coil_number: string, rm_code: string | null, location_code: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  try {
    const res = await fetch(`${base}/functions/v1/sheets-writeback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ coil_number, rm_code, location_code }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok === true, detail: data.error ?? data.action ?? "" };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

export async function assignRack(coilNumber: string, locationCode: string, rmCode: string | null) {
  const actor = await requireAdmin();
  const code = locationCode.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ./-]*$/.test(code)) {
    return { ok: false, writeback: false, message: "Invalid rack code format" };
  }
  const svc = createServiceClient();

  // 1. local assignment (source of truth for the app until next sheet sync)
  await svc.from("coil_locations").upsert(
    { coil_number: coilNumber, rm_code: rmCode, rack: code, location_code: code, assigned_by: actor.id, assigned_at: new Date().toISOString() },
    { onConflict: "coil_number" },
  );
  await svc.from("audit_logs").insert({
    user_id: actor.id, action: "ASSIGN_LOCATION", table_name: "coil_locations",
    record_id: coilNumber, new_value: { location_code: code },
  });
  await svc.rpc("run_fifo_merge");

  // 2. write-back to the sheet (best effort)
  const wb = await writeBackRack(coilNumber, rmCode, code);
  await svc.from("sync_logs").insert({
    sheet_tab: "Racked (248)", trigger: "manual",
    status: wb.ok ? "success" : "failed", rows_synced: wb.ok ? 1 : 0,
    error_message: wb.ok ? null : `write-back: ${wb.detail}`, completed_at: new Date().toISOString(),
  });

  revalidatePath("/fifo-board");
  return { ok: true, writeback: wb.ok, message: wb.ok ? "Rack assigned and written to the sheet." : "Rack assigned. Sheet write-back failed — retry or wait for next sync." };
}

// Retry only the sheet write-back (assignment already saved locally).
export async function retryWriteBack(coilNumber: string, locationCode: string, rmCode: string | null) {
  await requireAdmin();
  const wb = await writeBackRack(coilNumber, rmCode, locationCode);
  return { ok: wb.ok, message: wb.ok ? "Written to the sheet." : `Still failing: ${wb.detail}` };
}
