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

interface DutyStatusToggleProps {
  userRole?: string;
}

export function DutyStatusToggle({ userRole }: DutyStatusToggleProps) {
  const isSalesPerson =
    userRole === "Offline_SalesPerson" || userRole === "SalesPerson";

  const {
    data: tracking,
    isLoading: isTrackingLoading,
  } = useMyTrackingQuery(isSalesPerson);

  const toggleMutation = useToggleTrackingMutation();
  const pingMutation = useSendLocationPingMutation();

  const [isLocating, setIsLocating] = useState(false);

  if (!isSalesPerson) {
    return null;
  }

  const isOnline = Boolean(tracking?.is_online);
  const isInactive = tracking?.tracking_status === "INACTIVE";
  const isPending =
    isLocating || toggleMutation.isPending || pingMutation.isPending;

  const performToggle = async (turnOnline: boolean) => {
    try {
      if (turnOnline) {
        setIsLocating(true);
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Location Permission Required",
              "Please allow location access to start your field duty shift.",
            );
            return;
          }

          const position = await Location.getCurrentPositionAsync({
            accuracy:
              Platform.OS === "android"
                ? Location.Accuracy.Balanced
                : Location.Accuracy.High,
          });

          const { latitude, longitude, accuracy } = position.coords;

          await pingMutation.mutateAsync({
            latitude,
            longitude,
            accuracy: accuracy ? Math.round(accuracy * 10) / 10 : 5.0,
            recorded_at: new Date(position.timestamp).toISOString(),
          });
        } catch {
          console.warn("Could not capture initial GPS position");
        } finally {
          setIsLocating(false);
        }

        await toggleMutation.mutateAsync({ is_online: true });
      } else {
        await toggleMutation.mutateAsync({ is_online: false });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update duty status.";
      Alert.alert("Error", msg);
    }
  };

  const handlePress = () => {
    if (isPending || isTrackingLoading) return;

    if (isOnline) {
      // Confirm before going offline to prevent accidental tap
      Alert.alert(
        "End Duty Shift?",
        "Going offline will pause your live location tracking.",
        [
          { text: "Keep Online", style: "cancel" },
          {
            text: "Go Offline",
            style: "destructive",
            onPress: () => performToggle(false),
          },
        ],
      );
    } else {
      performToggle(true);
    }
  };

  // Determine pill styling based on state
  const pillBg = isOnline
    ? isInactive
      ? "bg-amber-50 border-amber-200"
      : "bg-emerald-50 border-emerald-200"
    : "bg-surface border-border";

  const statusLabel = isPending
    ? isLocating
      ? "Locating..."
      : "Updating..."
    : isOnline
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
      disabled={isPending || isTrackingLoading}
      hitSlop={6}
      className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm active:scale-95 ${pillBg}`}
    >
      {/* Status Dot / Live Beacon / Loading Spinner */}
      {isPending || isTrackingLoading ? (
        <ActivityIndicator
          size="small"
          color={isOnline ? "#059669" : "#79726b"}
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
        <View className="h-3 w-3 rounded-full bg-white shadow-sm" />
      </View>
    </Pressable>
  );
}
