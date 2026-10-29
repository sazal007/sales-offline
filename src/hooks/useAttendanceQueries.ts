// src/hooks/useAttendanceQueries.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAttendanceConfig,
  getAttendanceList,
  getTodayAttendanceStatus,
  postAttendance,
} from "@/services/attendance.service";
import type { PostAttendancePayload } from "@/types/attendance";

export const ATTENDANCE_CONFIG_KEY = ["attendance", "config"] as const;
export const ATTENDANCE_LIST_KEY = ["attendance", "list"] as const;
export const ATTENDANCE_TODAY_KEY = ["attendance", "today"] as const;

/**
 * Get cutoff time config.
 */
export function useAttendanceConfigQuery(enabled = true) {
  return useQuery({
    queryKey: ATTENDANCE_CONFIG_KEY,
    queryFn: getAttendanceConfig,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Check if attendance has already been posted today via GET /api/attendance/today/
 * Response: { "attendance": boolean }
 */
export function useTodayAttendanceQuery(enabled = true) {
  return useQuery({
    queryKey: ATTENDANCE_TODAY_KEY,
    queryFn: getTodayAttendanceStatus,
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * Get attendance list (sorted by newest attendance_date).
 */
export function useAttendanceListQuery(enabled = true) {
  return useQuery({
    queryKey: ATTENDANCE_LIST_KEY,
    queryFn: () => getAttendanceList({ ordering: "-attendance_date" }),
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Mutation to submit attendance proof with image, location and GPS.
 */
export function usePostAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PostAttendancePayload) => postAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_TODAY_KEY });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}
