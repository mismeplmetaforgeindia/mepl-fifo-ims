"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const { user, isAdmin } = await getSessionUser();
  if (!user || !isAdmin) throw new Error("Admin access required");
  return user;
}

export async function setUserRole(userId: string, role: "admin" | "viewer") {
  const actor = await requireAdmin();
  const svc = createServiceClient();
  const { data: old } = await svc.from("users").select("role").eq("id", userId).single();
  await svc.from("users").update({ role }).eq("id", userId);
  await svc.from("audit_logs").insert({
    user_id: actor.id, action: "UPDATE", table_name: "users",
    record_id: userId, old_value: old ?? null, new_value: { role },
  });
  revalidatePath("/admin");
}

export async function setUserActive(userId: string, isActive: boolean) {
  const actor = await requireAdmin();
  const svc = createServiceClient();
  await svc.from("users").update({ is_active: isActive }).eq("id", userId);
  await svc.from("audit_logs").insert({
    user_id: actor.id, action: "UPDATE", table_name: "users",
    record_id: userId, new_value: { is_active: isActive },
  });
  revalidatePath("/admin");
}
