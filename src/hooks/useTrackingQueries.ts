// src/hooks/useTrackingQueries.ts

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyTrackingStatus,
  toggleTrackingStatus,
  sendLocationPing,
  sendBatchLocationPings,
} from "@/services/tracking.service";
import type {
  SalespersonLocationPingPayload,
  SalespersonToggleOnlinePayload,
  SalespersonBatchPingPayload,
} from "@/types/tracking";

export const MY_TRACKING_KEY = ["myTracking"] as const;

// Module-level guard to avoid overlapping concurrent GPS requests
let isPingingInProgress = false;

/**
 * Capture current GPS coordinates and send location ping to the backend.
 */
async function pingCurrentLocation() {
  if (isPingingInProgress) return;
  isPingingInProgress = true;

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return;

    let position = await Location.getCurrentPositionAsync({
      accuracy:
        Platform.OS === "android"
          ? Location.Accuracy.Balanced
          : Location.Accuracy.High,
    }).catch(() => null);

    // Fallback to last known position if fresh fix is unavailable (e.g. indoors)
    if (!position) {
      position = await Location.getLastKnownPositionAsync().catch(() => null);
    }

    if (!position) return;

    const { latitude, longitude, accuracy } = position.coords;

    await sendLocationPing({
      latitude,
      longitude,
      accuracy: accuracy ? Math.round(accuracy * 10) / 10 : 5.0,
      recorded_at: new Date(position.timestamp).toISOString(),
    });
  } catch (err) {
    console.warn("Periodic location ping failed:", err);
  } finally {
    isPingingInProgress = false;
  }
}

/**
 * Hook to automatically send GPS location pings to the backend every 10 seconds.
 * Only runs when enabled is true.
 */
export function useLocationPingInterval(enabled = true, intervalMs = 10000) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;

    // Send initial location ping immediately
    pingCurrentLocation();

    // Schedule periodic pings every 10 seconds
    const timer = setInterval(() => {
      if (enabledRef.current) {
        pingCurrentLocation();
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}

/**
 * Fetch the authenticated salesperson's live tracking status.
 * Polled periodically while the screen is active, and automatically
 * sends GPS location to the backend every 10 seconds while online.
 */
export function useMyTrackingQuery(enabled = true) {
  const query = useQuery({
    queryKey: MY_TRACKING_KEY,
    queryFn: getMyTrackingStatus,
    enabled,
    refetchInterval: (query) => (query.state.data?.is_online ? 20000 : false),
    refetchOnWindowFocus: (query) => Boolean(query.state.data?.is_online),
  });

  const isOnline = Boolean(query.data?.is_online);

  // Automatically broadcast GPS location every 10s when online
  useLocationPingInterval(enabled && isOnline, 10000);

  return query;
}

/**
 * Mutation to toggle salesperson shift availability (is_online: true/false).
 */
export function useToggleTrackingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SalespersonToggleOnlinePayload) =>
      toggleTrackingStatus(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_TRACKING_KEY });
    },
  });
}

/**
 * Mutation to submit live location ping manually.
 */
export function useSendLocationPingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SalespersonLocationPingPayload) =>
      sendLocationPing(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_TRACKING_KEY });
    },
  });
}

/**
 * Mutation to upload offline buffered location pings.
 */
export function useBatchLocationPingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SalespersonBatchPingPayload) =>
      sendBatchLocationPings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_TRACKING_KEY });
    },
  });
}
