"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const { user, isAdmin } = await getSessionUser();
  if (!user || !isAdmin) throw new Error("Admin access required");
  return user;
}

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
    return res.ok && data.ok === true;
  } catch {
    return false;
  }
}

export async function assignRackBulk(
  items: { coil: string; rm: string | null }[],
  locationCode: string,
) {
  const actor = await requireAdmin();
  const code = locationCode.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ./-]*$/.test(code)) return { ok: false, assigned: 0, writebackFailed: 0, message: "Invalid rack code" };
  const list = items.slice(0, 100); // safety cap per call
  const svc = createServiceClient();
  const now = new Date().toISOString();

  await svc.from("coil_locations").upsert(
    list.map((i) => ({ coil_number: i.coil, rm_code: i.rm, rack: code, location_code: code, assigned_by: actor.id, assigned_at: now })),
    { onConflict: "coil_number" },
  );
  await svc.from("audit_logs").insert(
    list.map((i) => ({ user_id: actor.id, action: "ASSIGN_LOCATION", table_name: "coil_locations", record_id: i.coil, new_value: { location_code: code, bulk: true } })),
  );
  await svc.rpc("run_fifo_merge");

  let writebackFailed = 0;
  for (const i of list) {
    const ok = await writeBackRack(i.coil, i.rm, code);
    if (!ok) writebackFailed++;
  }
  await svc.from("sync_logs").insert({
    sheet_tab: "Racked (248)", trigger: "manual",
    status: writebackFailed === 0 ? "success" : "partial",
    rows_synced: list.length - writebackFailed, rows_skipped: writebackFailed,
    error_message: writebackFailed ? `${writebackFailed} write-backs failed` : null, completed_at: now,
  });

  revalidatePath("/unracked");
  revalidatePath("/fifo-board");
  return {
    ok: true, assigned: list.length, writebackFailed,
    message: writebackFailed === 0
      ? `Assigned ${list.length} coil(s) to ${code} and wrote to the sheet.`
      : `Assigned ${list.length} coil(s) to ${code}. ${writebackFailed} sheet write-back(s) failed — will reconcile on next sync.`,
  };
}

export async function setHidden(coilNumber: string, hidden: boolean) {
  const actor = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from("fifo_lots").update({ hidden }).eq("coil_number", coilNumber);
  if (error) return { ok: false, error: error.message };
  await svc.from("audit_logs").insert({
    user_id: actor.id, action: "UPDATE", table_name: "fifo_lots",
    record_id: coilNumber, new_value: { hidden },
  });
  revalidatePath("/unracked");
  revalidatePath("/fifo-board");
  return { ok: true };
}
