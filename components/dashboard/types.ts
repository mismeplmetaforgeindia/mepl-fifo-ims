import type { DashboardRow } from "@/types/database";
export type InvRow = DashboardRow & { coil_count: number };
export interface ActivityEvent {
  type: "issue" | "grn";
  date: string | null;
  rm: string | null;
  coil: string | null;
  ref: string | null;
  qty: number;
}
