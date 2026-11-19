// src/components/tracking/DutyStatusToggle.tsx

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import {
  useMyTrackingQuery,
  useSendLocationPingMutation,
  useToggleTrackingMutation,
} from "@/hooks/useTrackingQueries";
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "@/tasks/locationTask";

interface DutyStatusToggleProps {
  userRole?: string;
  onToggledOnline?: () => void;
}

export function DutyStatusToggle({
  userRole,
  onToggledOnline,
}: DutyStatusToggleProps) {
  const isSalesPerson =
    userRole === "Offline_SalesPerson" || userRole === "SalesPerson";

  const {
    data: tracking,
    isLoading: isTrackingLoading,
  } = useMyTrackingQuery(isSalesPerson);

  const toggleMutation = useToggleTrackingMutation();
  const pingMutation = useSendLocationPingMutation();

  const [optimisticOnline, setOptimisticOnline] = useState<boolean | null>(null);

  if (!isSalesPerson) {
    return null;
  }

  const serverOnline = Boolean(tracking?.is_online);
  const isOnline = optimisticOnline !== null ? optimisticOnline : serverOnline;
  const isInactive = tracking?.tracking_status === "INACTIVE" && isOnline;

  const handlePress = async () => {
    if (toggleMutation.isPending) return;

    const nextOnline = !isOnline;
    // 1. Instant optimistic state update
    setOptimisticOnline(nextOnline);

    if (nextOnline) {
      // 2. Instantly notify parent so attendance modal opens without waiting
      onToggledOnline?.();

      // 3. Fire online mutation
      toggleMutation.mutate(
        { is_online: true },
        {
          onError: (err: unknown) => {
            setOptimisticOnline(null);
            const msg =
              err instanceof Error ? err.message : "Failed to go online.";
            Alert.alert("Error", msg);
          },
          onSettled: () => {
            setOptimisticOnline(null);
          },
        },
      );

      // 4. Non-blocking fast background GPS capture and tracking start
      void (async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === "granted") {
            let position = await Location.getLastKnownPositionAsync().catch(() => null);
            if (!position) {
              position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }).catch(() => null);
            }
            if (position) {
              const { latitude, longitude, accuracy } = position.coords;
              pingMutation.mutate({
                latitude,
                longitude,
                accuracy: accuracy ? Math.round(accuracy * 10) / 10 : 5.0,
                recorded_at: new Date(position.timestamp).toISOString(),
              });
            }
          }
          startBackgroundLocationTracking().catch(() => {});
        } catch {
          // Silent fallback: foreground ping interval in useTrackingQueries will handle it
        }
      })();
    } else {
      // 5. Offline switch (instant)
      toggleMutation.mutate(
        { is_online: false },
        {
          onError: (err: unknown) => {
            setOptimisticOnline(null);
            const msg =
              err instanceof Error ? err.message : "Failed to go offline.";
            Alert.alert("Error", msg);
          },
          onSettled: () => {
            setOptimisticOnline(null);
          },
        },
      );

      void stopBackgroundLocationTracking().catch(() => {});
    }
  };

  // Determine pill styling based on state
  const pillBg = isOnline
    ? isInactive
      ? "bg-amber-50 border-amber-200"
      : "bg-emerald-50 border-emerald-200"
    : "bg-white border-border";

  const statusLabel = isOnline
    ? isInactive
      ? "No Signal"
      : "Online"
    : "Offline";

  const textColor = isOnline
    ? isInactive
      ? "text-amber-800"
      : "text-emerald-700"
    : "text-ink-soft";

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={6}
      className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 active:scale-95 ${pillBg}`}
    >
      {/* Status Dot / Live Beacon / Initial Loading Spinner */}
      {isTrackingLoading && tracking === undefined ? (
        <ActivityIndicator
          size="small"
          color="#79726b"
          style={{ width: 14, height: 14 }}
        />
      ) : isOnline ? (
        <View className="relative h-2.5 w-2.5 items-center justify-center">
          <View
            className={`h-2 w-2 rounded-full ${
              isInactive ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          <View
            className={`absolute h-4 w-4 rounded-full opacity-30 ${
              isInactive ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
        </View>
      ) : (
        <View className="h-2 w-2 rounded-full bg-ink-soft/40" />
      )}

      {/* Label */}
      <Text className={`text-xs font-bold ${textColor}`}>{statusLabel}</Text>

      {/* Modern Custom Micro Switch */}
      <View
        className={`h-4 w-7 rounded-full px-0.5 justify-center ${
          isOnline
            ? isInactive
              ? "bg-amber-500 items-end"
              : "bg-emerald-600 items-end"
            : "bg-border items-start"
        }`}
      >
        <View className="h-3 w-3 rounded-full bg-white" />
      </View>
    </Pressable>
  );
}
