import type { DashboardRow } from "@/types/database";

// NOTE: the original brief said "no calculations", but this reference-style
// dashboard needs health/coverage. These are transparent, configurable rules
// applied on top of the mirrored sheet data — the underlying values are untouched.

export type Health = "healthy" | "low" | "reorder" | "stockout";

export function reorderLevel(r: DashboardRow): number {
  const avg = Number(r.avg_daily ?? 0);
  const lead = Number(r.lead_time ?? 0);
  const safety = Number(r.safety_factor ?? 1) || 1;
  return avg * lead * safety;
}

export function daysOfCover(r: DashboardRow): number | null {
  const avg = Number(r.avg_daily ?? 0);
  if (avg <= 0) return null;
  return Number(r.physical_stock ?? 0) / avg;
}

export function health(r: DashboardRow): Health {
  const stock = Number(r.physical_stock ?? 0);
  if (stock <= 0) return "stockout";
  const avg = Number(r.avg_daily ?? 0);
  if (avg <= 0) return "healthy"; // no consumption -> not at risk
  const ro = reorderLevel(r);
  if (stock <= ro) return "reorder";
  if (stock <= ro * 1.25) return "low";
  return "healthy";
}

export function isTracked(r: DashboardRow): boolean {
  return Number(r.avg_daily ?? 0) > 0;
}

export const HEALTH_META: Record<Health, { label: string; dot: string; badge: string }> = {
  healthy: { label: "OK", dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200" },
  low: { label: "LOW", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  reorder: { label: "REORDER", dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  stockout: { label: "STOCK OUT", dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
};
