// src/types/tracking.ts

export type TrackingStatus = "ONLINE" | "INACTIVE" | "OFFLINE";

export interface SalespersonLocationPingPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string; // ISO 8601
}

export interface SalespersonToggleOnlinePayload {
  is_online: boolean;
}

export interface SalespersonTrackingMeResponse {
  id: number;
  salesperson_id: number;
  username: string;
  full_name: string;
  phone_number: string;
  role: string;
  franchise_id?: number | null;
  franchise_name?: string | null;
  distributor_id?: number | null;
  distributor_name?: string | null;
  latitude: number;
  longitude: number;
  accuracy: number;
  is_online: boolean;
  is_active_now?: boolean;
  tracking_status?: TrackingStatus;
  seconds_since_last_ping?: number;
  last_updated_at: string;
}

export interface SalespersonToggleStatusResponse {
  id: number;
  salesperson_id: number;
  username: string;
  full_name: string;
  phone_number: string;
  role: string;
  franchise_id?: number | null;
  franchise_name?: string | null;
  latitude: number;
  longitude: number;
  accuracy: number;
  is_online: boolean;
  last_updated_at: string;
}

export interface SalespersonBatchPingPayload {
  pings: SalespersonLocationPingPayload[];
}

export interface SalespersonBatchPingResponse {
  status: string;
  message: string;
  synced_count: number;
}

