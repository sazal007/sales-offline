// src/types/attendance.ts

export interface AttendanceConfigResponse {
  id: number;
  cutoff_time: string; // "HH:MM:SS" e.g. "12:00:00"
  updated_by?: number;
  updated_by_name?: string;
  updated_at?: string;
  created_at?: string;
}

export interface TodayAttendanceStatusResponse {
  attendance: boolean;
}

export interface AttendanceRecordResponse {
  id: number;
  sales_person: number;
  sales_person_name: string;
  image: string | null;
  attendance_date: string; // "YYYY-MM-DD"
  attendance_time: string; // ISO 8601
  attendance_location: string;
  attendance_lat: string;
  attendance_long: string;
}

export interface AttendanceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AttendanceRecordResponse[];
}

export interface PostAttendancePayload {
  image: {
    uri: string;
    name?: string;
    type?: string;
  };
  attendance_location: string;
  attendance_lat: string;
  attendance_long: string;
}
