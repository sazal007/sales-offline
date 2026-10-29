// src/services/tracking.service.ts

import apiClient from "@/lib/api-client";
import * as SecureStore from "expo-secure-store";
import type {
  SalespersonLocationPingPayload,
  SalespersonTrackingMeResponse,
  SalespersonToggleOnlinePayload,
  SalespersonToggleStatusResponse,
  SalespersonBatchPingPayload,
  SalespersonBatchPingResponse,
} from "@/types/tracking";

const TRACKING_ME_ENDPOINT = "/api/tracking/me/";
const TOGGLE_STATUS_ENDPOINT = "/api/tracking/toggle-status/";
const LOCATION_PING_ENDPOINT = "/api/tracking/location/";
const BATCH_LOCATION_ENDPOINT = "/api/tracking/locations/batch/";

async function getAuthHeader() {
  const token = await SecureStore.getItemAsync("cem_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch the salesperson's own active tracking state, coordinates, and duty status.
 * Endpoint: GET /api/tracking/me/
 */
export async function getMyTrackingStatus(): Promise<SalespersonTrackingMeResponse> {
  const headers = await getAuthHeader();
  const response = await apiClient.get<SalespersonTrackingMeResponse>(
    TRACKING_ME_ENDPOINT,
    { headers },
  );
  return response.data;
}

/**
 * Toggle work shift availability (online / offline).
 * Endpoint: POST /api/tracking/toggle-status/
 */
export async function toggleTrackingStatus(
  payload: SalespersonToggleOnlinePayload,
): Promise<SalespersonToggleStatusResponse> {
  const headers = await getAuthHeader();
  const response = await apiClient.post<SalespersonToggleStatusResponse>(
    TOGGLE_STATUS_ENDPOINT,
    payload,
    { headers },
  );
  return response.data;
}

/**
 * Submit live GPS coordinate ping.
 * Endpoint: POST /api/tracking/location/
 */
export async function sendLocationPing(
  payload: SalespersonLocationPingPayload,
): Promise<SalespersonTrackingMeResponse> {
  const headers = await getAuthHeader();
  const response = await apiClient.post<SalespersonTrackingMeResponse>(
    LOCATION_PING_ENDPOINT,
    payload,
    { headers },
  );
  return response.data;
}

/**
 * Upload buffered GPS coordinates saved while offline.
 * Endpoint: POST /api/tracking/locations/batch/
 */
export async function sendBatchLocationPings(
  payload: SalespersonBatchPingPayload,
): Promise<SalespersonBatchPingResponse> {
  const headers = await getAuthHeader();
  const response = await apiClient.post<SalespersonBatchPingResponse>(
    BATCH_LOCATION_ENDPOINT,
    payload,
    { headers },
  );
  return response.data;
}

