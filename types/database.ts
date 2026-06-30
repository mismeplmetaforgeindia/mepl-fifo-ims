// Hand-written for Phase 1. Regenerate the authoritative version once the
// Supabase project is linked:
//   npx supabase gen types typescript --linked > types/database.ts

export type Role = "admin" | "viewer";
export type FifoStatus = "available" | "issued" | "pending_location";
export type SyncStatus = "success" | "partial" | "failed";

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface RmMasterRow {
  id: string;
  rm_code: string;
  description: string | null;
  plant: string | null;
  lead_time: number | null;
  safety_factor: number | null;
  max_level: number | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface GrnEntryRow {
  id: string;
  coil_number: string;
  rm_code: string | null;
  heat_number: string | null;
  weight: number | null;
  supplier: string | null;
  received_date: string;
  plant: string | null;
  source: "GRN" | "transfer";
  synced_at: string;
}

export interface FifoLotRow {
  id: string;
  coil_number: string;
  rm_code: string | null;
  weight_available: number | null;
  status: FifoStatus;
  location_code: string | null;
  created_at: string;
  updated_at: string;
}

// Shape returned by the v_fifo_queue view (sequence + age computed at query time).
export interface FifoQueueItem {
  id: string;
  coil_number: string;
  rm_code: string | null;
  heat_number: string | null;
  received_date: string;
  age_days: number;
  weight_available: number | null;
  source: "GRN" | "transfer";
  status: FifoStatus;
  location_code: string | null;
  rack: string | null;
  bay: string | null;
  row_no: string | null;
  level_no: string | null;
  has_location: boolean;
  fifo_sequence: number;
}

export interface DashboardRow {
  id: string;
  rm_code: string;
  description: string | null;
  plant: string | null;
  physical_stock: number | null;
  peak_avg_daily: number | null;
  avg_daily: number | null;
  off_avg_daily: number | null;
  lead_time: number | null;
  safety_factor: number | null;
  max_level: number | null;
  opening_stock: number | null;
  inward: number | null;
  outward: number | null;
  khatwad_received: number | null;
  khatwad_sent: number | null;
  synced_at: string;
}
