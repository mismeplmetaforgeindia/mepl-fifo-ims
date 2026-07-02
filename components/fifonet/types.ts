export interface FifoNetKpis { total_lots: number; remaining_kg: number; depleted: number; critical_aging: number; }
export interface FifoNetSummary {
  rm_code: string; description: string | null; total_lots: number;
  total_remaining: number; depleted: number; no_rack: number;
}
export interface FifoNetItem {
  id: string; coil_number: string; rm_code: string | null; heat_number: string | null;
  received_date: string; age_days: number; grn_weight: number | null; issued_total: number;
  weight_remaining: number; net_raw: number; issue_count: number;
  source: "GRN" | "transfer"; status: string; location_code: string | null; rack: string | null;
  has_location: boolean; hidden: boolean; fifo_sequence: number;
}
export interface IssueTxn {
  id: string; issue_date: string | null; machine: string | null; issued_qty: number | null; shift: string | null;
}
