// src/services/attendance.service.ts

import apiClient from "@/lib/api-client";
import type {
  AttendanceConfigResponse,
  AttendanceListResponse,
  AttendanceRecordResponse,
  PostAttendancePayload,
  TodayAttendanceStatusResponse,
} from "@/types/attendance";

const ATTENDANCE_BASE = "/api/offline-sales/attendance/";
const ATTENDANCE_CONFIG = "/api/offline-sales/attendance/config/";
const ATTENDANCE_TODAY_ENDPOINT = "/api/offline-sales/attendance/today/";

/**
 * Check if attendance has already been posted today.
 * Endpoint: GET /api/attendance/today/
 * Response: { "attendance": boolean }
 */
export async function getTodayAttendanceStatus(): Promise<TodayAttendanceStatusResponse> {
  const response = await apiClient.get<TodayAttendanceStatusResponse>(
    ATTENDANCE_TODAY_ENDPOINT,
  );
  return response.data;
}

/**
 * Fetch cutoff time and current attendance config.
 * Endpoint: GET /api/offline-sales/attendance/config/
 */
export async function getAttendanceConfig(): Promise<AttendanceConfigResponse> {
  const response =
    await apiClient.get<AttendanceConfigResponse>(ATTENDANCE_CONFIG);
  return response.data;
}

/**
 * Fetch recent attendance records for the authenticated salesperson.
 * Endpoint: GET /api/offline-sales/attendance/?ordering=-attendance_date
 */
export async function getAttendanceList(params?: {
  page?: number;
  ordering?: string;
  search?: string;
}): Promise<AttendanceListResponse> {
  const response = await apiClient.get<AttendanceListResponse>(
    ATTENDANCE_BASE,
    {
      params: {
        ordering: "-attendance_date",
        ...params,
      },
    },
  );
  return response.data;
}

/**
 * Submit daily attendance proof (selfie, address, coordinates).
 * Endpoint: POST /api/offline-sales/attendance/
 */
export async function postAttendance(
  payload: PostAttendancePayload,
): Promise<AttendanceRecordResponse> {
  const formData = new FormData();

  const fileUri = payload.image.uri;
  const fileName =
    payload.image.name || fileUri.split("/").pop() || "attendance_selfie.jpg";
  const match = /\.(\w+)$/.exec(fileName);
  const fileType = match ? `image/${match[1].toLowerCase()}` : "image/jpeg";

  // React Native FormData file attachment syntax
  formData.append("image", {
    uri: fileUri,
    name: fileName,
    type: fileType,
  } as unknown as Blob);

  formData.append("attendance_location", payload.attendance_location);
  formData.append("attendance_lat", String(payload.attendance_lat));
  formData.append("attendance_long", String(payload.attendance_long));

  const response = await apiClient.post<AttendanceRecordResponse>(
    ATTENDANCE_BASE,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}
