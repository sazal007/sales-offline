// src/tasks/locationTask.ts
//
// Background location task definition.
// ⚠️  MUST be imported in the root _layout.tsx so that the task is registered
//     before any navigation occurs (Expo Router requirement).
//
// The task is started by `startBackgroundLocationTracking()` (called when the
// salesperson goes Online) and stopped by `stopBackgroundLocationTracking()`
// (called when going Offline or on logout).

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import Constants from "expo-constants";

export const BACKGROUND_LOCATION_TASK = "background-location-task";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL ??
  "";

const LOCATION_PING_ENDPOINT = `${API_BASE_URL}/api/tracking/location/`;

// ─── Task definition ─────────────────────────────────────────────────────────

TaskManager.defineTask(
  BACKGROUND_LOCATION_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error) {
      console.warn("[BG Location] Task error:", error.message);
      return;
    }

    if (!data?.locations?.length) return;

    const location = data.locations[data.locations.length - 1];
    const { latitude, longitude, accuracy } = location.coords;

    try {
      const token = await SecureStore.getItemAsync("cem_access_token");
      if (!token) return;

      await axios.post(
        LOCATION_PING_ENDPOINT,
        {
          latitude,
          longitude,
          accuracy: accuracy ? Math.round(accuracy * 10) / 10 : 5.0,
          recorded_at: new Date(location.timestamp).toISOString(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      console.warn("[BG Location] Ping failed:", err);
    }
  },
);

// ─── Helpers called from DutyStatusToggle ────────────────────────────────────

/**
 * Requests background location permission (requires foreground permission first)
 * and starts the background location task that pings the server every ~30 s.
 * Returns true on success, false if permissions were denied.
 */
export async function startBackgroundLocationTracking(): Promise<boolean> {
  try {
    // 1. Foreground permission (may already be granted)
    const { status: fgStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") return false;

    // 2. Background permission ("Always Allow")
    const { status: bgStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== "granted") {
      // Fall back: let the foreground interval in useTrackingQueries handle it
      console.warn("[BG Location] Background permission denied; using foreground fallback.");
      return false;
    }

    // 3. Don't double-start
    const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (alreadyRunning) return true;

    // 4. Start background updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30_000,      // ≥30 s between updates (ms)
      distanceInterval: 20,      // or ≥20 m movement
      showsBackgroundLocationIndicator: true, // iOS blue pill
      foregroundService: {
        // Android: keeps a persistent notification so OS won't kill the task
        notificationTitle: "Field Duty Active",
        notificationBody: "Your location is being shared with dispatch.",
        notificationColor: "#e8452c",
      },
    });

    return true;
  } catch (err) {
    console.warn("[BG Location] Failed to start background tracking:", err);
    return false;
  }
}

/**
 * Stops the background location task.
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (err) {
    console.warn("[BG Location] Failed to stop background tracking:", err);
  }
}

/**
 * Returns whether the background task is currently running.
 */
export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

