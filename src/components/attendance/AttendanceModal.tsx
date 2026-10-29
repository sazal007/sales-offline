// src/components/attendance/AttendanceModal.tsx

import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  RefreshCw,
  X,
} from "lucide-react-native";
import {
  useAttendanceConfigQuery,
  usePostAttendanceMutation,
} from "@/hooks/useAttendanceQueries";

interface AttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AttendanceModal({
  visible,
  onClose,
  onSuccess,
}: AttendanceModalProps) {
  const { data: config } = useAttendanceConfigQuery(visible);
  const postMutation = usePostAttendanceMutation();

  // Form states — all fields are strictly required
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);

  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>("");

  const [isLocating, setIsLocating] = useState(false);

  // Auto-acquire GPS and address when modal opens
  useEffect(() => {
    if (visible) {
      setImageUri(null);
      setImageName(null);
      setImageType(null);
      setLocationName("");
      setLatitude("");
      setLongitude("");
      setAccuracy(null);
      fetchCurrentLocation();
    }
  }, [visible]);

  const fetchCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please allow location access to record your attendance coordinates.",
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy:
          Platform.OS === "android"
            ? Location.Accuracy.Balanced
            : Location.Accuracy.High,
      });

      const latStr = String(position.coords.latitude);
      const lngStr = String(position.coords.longitude);
      setLatitude(latStr);
      setLongitude(lngStr);
      if (position.coords.accuracy) {
        setAccuracy(Math.round(position.coords.accuracy));
      }

      // Reverse geocode to get street / city address
      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (reverseResults && reverseResults.length > 0) {
          const item = reverseResults[0];
          const parts = [
            item.name || item.street,
            item.district || item.subregion,
            item.city,
          ].filter(Boolean);

          const fullAddress = parts.join(", ");
          if (fullAddress && !locationName) {
            setLocationName(fullAddress);
          }
        }
      } catch {
        // If reverse geocode fails, user can type location name manually
      }
    } catch (err: unknown) {
      console.warn("Could not capture GPS:", err);
      Alert.alert(
        "GPS Unavailable",
        "Unable to fetch your current GPS position. Please ensure Location services are turned on.",
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera access to take your attendance selfie.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageName(asset.fileName || "selfie.jpg");
        setImageType(asset.mimeType || "image/jpeg");
      }
    } catch (err: unknown) {
      console.warn("Camera error:", err);
      Alert.alert("Camera Error", "Could not open camera.");
    }
  };

  const isFormValid =
    Boolean(imageUri) &&
    Boolean(locationName.trim()) &&
    Boolean(latitude) &&
    Boolean(longitude);

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert("Photo Required", "Please capture your selfie / proof photo.");
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert(
        "GPS Required",
        "GPS coordinates are required. Tap 'Refresh GPS' to capture your location.",
      );
      return;
    }

    if (!locationName.trim()) {
      Alert.alert(
        "Location Required",
        "Please enter your current location address or place name.",
      );
      return;
    }

    try {
      await postMutation.mutateAsync({
        image: {
          uri: imageUri,
          name: imageName || "selfie.jpg",
          type: imageType || "image/jpeg",
        },
        attendance_location: locationName.trim(),
        attendance_lat: latitude,
        attendance_long: longitude,
      });

      Alert.alert("Success", "Daily attendance posted successfully!");
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to post attendance.";
      Alert.alert("Attendance Failed", msg);
    }
  };

  // Format cutoff time display e.g. "12:00:00" -> "12:00 PM"
  const formattedCutoff = (() => {
    if (!config?.cutoff_time) return null;
    const [hours, minutes] = config.cutoff_time.split(":");
    const h = parseInt(hours, 10);
    const m = minutes || "00";
    if (isNaN(h)) return config.cutoff_time;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  })();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable className="flex-1" onPress={onClose} />

        <View className="max-h-[90%] rounded-t-3xl border-t border-border bg-background pb-8 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
            <View>
              <Text className="text-base font-bold text-ink">
                Post Attendance
              </Text>
              {formattedCutoff && (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Clock size={11} color="#e8452c" />
                  <Text className="text-xs font-semibold text-brand">
                    Cutoff: {formattedCutoff}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-surface"
            >
              <X size={16} color="#79726b" />
            </Pressable>
          </View>

          <ScrollView
            className="px-5 pt-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-4 pb-6">
              {/* 1. Selfie / Photo Section (Required) */}
              <View>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-ink-soft">
                    Photo Proof (Selfie) *
                  </Text>
                  <Text className="text-[11px] font-bold text-brand">Required</Text>
                </View>

                {imageUri ? (
                  <View className="items-center rounded-2xl border border-border bg-surface p-3">
                    <Image
                      source={{ uri: imageUri }}
                      className="h-44 w-44 rounded-xl"
                      resizeMode="cover"
                    />
                    <View className="mt-3">
                      <Pressable
                        onPress={handleTakePhoto}
                        className="flex-row items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 active:opacity-75"
                      >
                        <Camera size={14} color="#241a12" />
                        <Text className="text-xs font-semibold text-ink">
                          Retake Selfie
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleTakePhoto}
                    className="rounded-2xl border-2 border-dashed border-border bg-surface p-5 items-center justify-center gap-3 active:opacity-85"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                      <Camera size={22} color="#e8452c" />
                    </View>
                    <View className="items-center">
                      <Text className="text-sm font-bold text-ink">
                        Take Attendance Selfie
                      </Text>
                      <Text className="mt-0.5 text-xs text-ink-soft">
                        Snap a front-facing selfie at your field location
                      </Text>
                    </View>
                    <View className="pt-1">
                      <View className="flex-row items-center gap-2 rounded-xl bg-brand px-5 py-2.5 shadow-sm">
                        <Camera size={15} color="#ffffff" strokeWidth={2.2} />
                        <Text className="text-xs font-bold text-white">
                          Open Camera
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                )}
              </View>

              {/* 2. GPS Coordinates Section (Required) */}
              <View>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-ink-soft">
                    GPS Coordinates *
                  </Text>
                  <Pressable
                    onPress={fetchCurrentLocation}
                    disabled={isLocating}
                    hitSlop={6}
                    className="flex-row items-center gap-1 active:opacity-70"
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#e8452c" />
                    ) : (
                      <>
                        <RefreshCw size={11} color="#e8452c" />
                        <Text className="text-[11px] font-bold text-brand">
                          Refresh GPS
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>

                <View className="rounded-xl border border-border bg-surface p-3.5 gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                        <Navigation size={13} color="#2563eb" />
                      </View>
                      <View>
                        <Text className="text-xs font-bold text-ink">
                          {latitude && longitude
                            ? `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`
                            : isLocating
                              ? "Detecting location..."
                              : "GPS not captured"}
                        </Text>
                        <Text className="text-[10px] text-ink-soft">
                          {accuracy !== null
                            ? `Accuracy: ±${accuracy}m`
                            : "Auto-detected from phone hardware"}
                        </Text>
                      </View>
                    </View>
                    {latitude && longitude ? (
                      <CheckCircle2 size={16} color="#059669" />
                    ) : (
                      <Pressable
                        onPress={fetchCurrentLocation}
                        className="rounded-lg bg-brand/10 px-2.5 py-1 active:opacity-75"
                      >
                        <Text className="text-[11px] font-bold text-brand">
                          Capture
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              {/* 3. Location Address / Place Name (Required) */}
              <View>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-ink-soft">
                    Location Address / Place Name *
                  </Text>
                  <Text className="text-[11px] font-bold text-brand">Required</Text>
                </View>
                <View className="relative flex-row items-center">
                  <View className="absolute left-3.5 z-10">
                    <MapPin size={15} color="#79726b" />
                  </View>
                  <TextInput
                    value={locationName}
                    onChangeText={setLocationName}
                    placeholder="e.g. Thamel, Kathmandu or Shop Name"
                    placeholderTextColor="#79726b"
                    className="flex-1 rounded-xl border border-border bg-surface py-3 pl-10 pr-3.5 text-sm font-medium text-ink"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={!isFormValid || postMutation.isPending}
                className={`mt-2 h-12 flex-row items-center justify-center gap-2 rounded-xl shadow-sm ${
                  isFormValid && !postMutation.isPending
                    ? "bg-brand active:opacity-85"
                    : "bg-brand/40"
                }`}
              >
                {postMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.2} />
                    <Text className="text-sm font-bold text-white">
                      Confirm Attendance
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

