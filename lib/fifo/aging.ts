// FIFO aging thresholds — shared by the board card borders and the table's
// Age column. Pure presentation: age comes from v_fifo_queue.age_days, which
// is CURRENT_DATE - received_date computed in the view (never stored).

export const AGE_AGING_DAYS = 30; // >= this -> amber
export const AGE_CRITICAL_DAYS = 60; // > this -> red

export type AgeState = "fresh" | "aging" | "critical";

export function ageState(days: number): AgeState {
  if (days > AGE_CRITICAL_DAYS) return "critical";
  if (days >= AGE_AGING_DAYS) return "aging";
  return "fresh";
}

// Tailwind border class per state (used by the FIFO card in Phase 3).
export function ageBorderClass(days: number, hasLocation: boolean): string {
  if (!hasLocation) return "border-fifo-pending";
  switch (ageState(days)) {
    case "critical":
      return "border-fifo-critical";
    case "aging":
      return "border-fifo-aging";
    default:
      return "border-fifo-fresh";
  }
}

// Age label text color (red for critical/aging, per the reference).
export function ageTextClass(days: number): string {
  const s = ageState(days);
  return s === "fresh" ? "text-muted-foreground" : "text-fifo-critical";
}
