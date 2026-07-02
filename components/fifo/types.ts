export interface FifoKpis {
  total_lots: number;
  available_kg: number;
  critical_aging: number;
  pending_rack: number;
}

export interface FifoRmSummary {
  rm_code: string;
  description: string | null;
  total_lots: number;
  total_weight: number;
  no_rack: number;
  racked: number;
}

export interface FifoQueueItem {
  id: string;
  coil_number: string;
  rm_code: string | null;
  heat_number: string | null;
  received_date: string;
  age_days: number;
  weight_available: number | null;
  source: "GRN" | "transfer";
  status: "available" | "issued" | "pending_location";
  location_code: string | null;
  rack: string | null;
  has_location: boolean;
  fifo_sequence: number;
}
