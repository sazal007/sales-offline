// src/components/orders/OrderEditView.tsx

import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Calendar,
  ImageIcon,
  Camera,
  AlertCircle,
} from "lucide-react-native";
import type {
  OfflineOrderDetailResponse,
  OfflinePaymentMethod,
  UpdateOfflineOrderPayload,
} from "@/types/offlineSales";
import { PAYMENT_METHODS } from "./orderHelpers";

interface OrderEditViewProps {
  order: OfflineOrderDetailResponse;
  onSave: (payload: UpdateOfflineOrderPayload) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function OrderEditView({
  order,
  onSave,
  onCancel,
  isSaving = false,
}: OrderEditViewProps) {
  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<OfflinePaymentMethod>("cash");
  const [remarks, setRemarks] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [dateObject, setDateObject] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    setTotalAmount(String(order.total_amount || ""));
    setPaidAmount(String(order.paid_amount || "0"));

    const lastPayment =
      order.payment_history && order.payment_history.length > 0
        ? order.payment_history[order.payment_history.length - 1]
        : null;
    setPaymentMethod(lastPayment?.payment_method || "cash");
    setRemarks(order.remarks || "");

    const dateStr = order.order_date || new Date().toISOString().split("T")[0];
    setOrderDate(dateStr);
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        setDateObject(
          new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])),
        );
      } else {
        setDateObject(new Date());
      }
    } catch {
      setDateObject(new Date());
    }

    setPaymentScreenshot(null);
    setFormErrors({});
    setApiError(null);
  }, [order]);

  const calculatedRemaining = useMemo(() => {
    const tot = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    return Math.max(0, tot - paid);
  }, [totalAmount, paidAmount]);

  const handlePickImage = async () => {
    try {
      const { granted } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Photo library access is required to upload a payment screenshot.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setPaymentScreenshot({
          uri: asset.uri,
          name: asset.fileName || asset.uri.split("/").pop() || "receipt.jpg",
          type: asset.mimeType || "image/jpeg",
        });
        setFormErrors((prev) => {
          const n = { ...prev };
          delete n.payment_screenshot;
          return n;
        });
      }
    } catch {
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is required to take a payment screenshot.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setPaymentScreenshot({
          uri: asset.uri,
          name: asset.fileName || asset.uri.split("/").pop() || "receipt.jpg",
          type: asset.mimeType || "image/jpeg",
        });
        setFormErrors((prev) => {
          const n = { ...prev };
          delete n.payment_screenshot;
          return n;
        });
      }
    } catch {
      Alert.alert("Error", "Could not take photo. Please try again.");
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      errors.total_amount = "Valid total amount is required";
    }

    const tot = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;

    if (paid < 0) {
      errors.paid_amount = "Paid amount cannot be negative";
    }

    if (paid > tot) {
      errors.paid_amount = "Paid amount cannot exceed total amount";
    }

    if (paymentMethod !== "cash" && paid > 0 && !paymentScreenshot) {
      const hasExistingScreenshot = order.payment_history?.some((p) =>
        Boolean(p.payment_screenshot),
      );
      if (!hasExistingScreenshot) {
        errors.payment_screenshot = `A screenshot is required for ${
          PAYMENT_METHODS.find((p) => p.key === paymentMethod)?.label ||
          paymentMethod
        } payments`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setApiError(null);

    const payload: UpdateOfflineOrderPayload = {
      total_amount: totalAmount.trim(),
      paid_amount: paidAmount.trim() || "0.00",
      payment_method: paymentMethod,
      order_date: orderDate,
      remarks: remarks.trim(),
      ...(paymentScreenshot ? { payment_screenshot: paymentScreenshot } : {}),
    };

    try {
      await onSave(payload);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update order.";
      setApiError(msg);
    }
  };

  return (
    <>
      {apiError && (
        <View className="mb-4 flex-row items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <AlertCircle size={18} color="#e8452c" />
          <Text className="flex-1 text-xs font-medium text-brand">
            {apiError}
          </Text>
        </View>
      )}

      {/* 1. Order Date */}
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Order Date
        </Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-surface px-4 active:bg-surface-soft"
        >
          <View className="flex-row items-center gap-2.5">
            <Calendar size={16} color="#e8452c" />
            <Text className="text-sm font-medium text-ink">{orderDate}</Text>
          </View>
          <Text className="text-xs font-semibold text-brand">Change</Text>
        </Pressable>

        {showDatePicker && (
          <View className="mt-2 rounded-xl border border-border bg-surface p-2">
            <DateTimePicker
              value={dateObject}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(
                event: DateTimePickerEvent,
                selectedDate?: Date,
              ) => {
                if (Platform.OS !== "ios") {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setDateObject(selectedDate);
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(
                    2,
                    "0",
                  );
                  const day = String(selectedDate.getDate()).padStart(2, "0");
                  setOrderDate(`${year}-${month}-${day}`);
                }
              }}
            />
            {Platform.OS === "ios" && (
              <Pressable
                onPress={() => setShowDatePicker(false)}
                className="mt-2 h-9 items-center justify-center rounded-lg bg-brand"
              >
                <Text className="text-xs font-bold text-white">Done</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* 2. Total Amount */}
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Total Order Amount (Rs.) *
        </Text>
        <View
          className={`flex-row items-center rounded-xl border bg-surface px-4 ${
            formErrors.total_amount ? "border-red-500" : "border-border"
          }`}
        >
          <Text className="mr-1 text-sm font-bold text-ink-soft">Rs.</Text>
          <TextInput
            value={totalAmount}
            onChangeText={(val) => {
              setTotalAmount(val);
              if (formErrors.total_amount) {
                setFormErrors((prev) => {
                  const n = { ...prev };
                  delete n.total_amount;
                  return n;
                });
              }
            }}
            placeholder="0.00"
            placeholderTextColor="#79726b"
            keyboardType="numeric"
            className="h-12 flex-1 text-sm font-bold text-ink"
          />
        </View>
        {formErrors.total_amount && (
          <Text className="mt-1 text-xs font-medium text-red-500">
            {formErrors.total_amount}
          </Text>
        )}
      </View>

      {/* 3. Paid Amount & Payment Method */}
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Paid Amount (Rs.)
        </Text>
        <View
          className={`flex-row items-center rounded-xl border bg-surface px-4 ${
            formErrors.paid_amount ? "border-red-500" : "border-border"
          }`}
        >
          <Text className="mr-1 text-sm font-bold text-ink-soft">Rs.</Text>
          <TextInput
            value={paidAmount}
            onChangeText={(val) => {
              setPaidAmount(val);
              if (formErrors.paid_amount) {
                setFormErrors((prev) => {
                  const n = { ...prev };
                  delete n.paid_amount;
                  return n;
                });
              }
            }}
            placeholder="0.00"
            placeholderTextColor="#79726b"
            keyboardType="numeric"
            className="h-12 flex-1 text-sm font-bold text-ink"
          />
        </View>
        {formErrors.paid_amount && (
          <Text className="mt-1 text-xs font-medium text-red-500">
            {formErrors.paid_amount}
          </Text>
        )}

        {/* Remaining Balance Summary Pill */}
        <View className="mt-2.5 flex-row items-center justify-between rounded-xl border border-border bg-surface p-3">
          <Text className="text-xs font-medium text-ink-soft">
            Updated Remaining Balance:
          </Text>
          <Text
            className={`text-sm font-bold ${
              calculatedRemaining > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            Rs. {calculatedRemaining.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 4. Payment Method */}
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Payment Method
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PAYMENT_METHODS.map((pm) => {
            const isSelected = paymentMethod === pm.key;
            return (
              <Pressable
                key={pm.key}
                onPress={() => setPaymentMethod(pm.key)}
                className={`rounded-xl border px-3.5 py-2.5 active:opacity-80 ${
                  isSelected
                    ? "border-brand bg-brand/10"
                    : "border-border bg-surface"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? "text-brand" : "text-ink-soft"
                  }`}
                >
                  {pm.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 5. Payment Screenshot (if non-cash & paid > 0) */}
      {paymentMethod !== "cash" && parseFloat(paidAmount) > 0 && (
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Payment Receipt / Screenshot *
          </Text>
          {paymentScreenshot ? (
            <View className="overflow-hidden rounded-xl border border-border bg-surface">
              <Image
                source={{ uri: paymentScreenshot.uri }}
                className="h-44 w-full"
                contentFit="contain"
              />
              <View className="flex-row items-center justify-between border-t border-border bg-surface p-2.5">
                <Text
                  numberOfLines={1}
                  className="mr-2 flex-1 text-xs text-ink-soft"
                >
                  {paymentScreenshot.name}
                </Text>
                <Pressable
                  onPress={() => setPaymentScreenshot(null)}
                  className="rounded-lg bg-red-50 px-2.5 py-1"
                >
                  <Text className="text-xs font-semibold text-brand">
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handlePickImage}
                  className="h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface active:bg-surface-soft"
                >
                  <ImageIcon size={20} color="#79726b" />
                  <Text className="text-xs font-medium text-ink-soft">
                    Upload Photo
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleTakePhoto}
                  className="h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface active:bg-surface-soft"
                >
                  <Camera size={20} color="#79726b" />
                  <Text className="text-xs font-medium text-ink-soft">
                    Take Camera
                  </Text>
                </Pressable>
              </View>
              {order.payment_history?.some((p) =>
                Boolean(p.payment_screenshot),
              ) && (
                <Text className="mt-1.5 text-[11px] font-medium text-emerald-600">
                  ✓ A receipt screenshot was previously uploaded for this order. Attach a new one only if you want to replace it.
                </Text>
              )}
            </View>
          )}
          {formErrors.payment_screenshot && (
            <Text className="mt-1 text-xs font-medium text-red-500">
              {formErrors.payment_screenshot}
            </Text>
          )}
        </View>
      )}

      {/* 6. Remarks */}
      <View className="mb-6">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Remarks / Credit Terms
        </Text>
        <TextInput
          value={remarks}
          onChangeText={setRemarks}
          placeholder="e.g. Credit terms, revised amount, delivery notes"
          placeholderTextColor="#79726b"
          multiline
          numberOfLines={2}
          className="min-h-[64px] rounded-xl border border-border bg-surface p-3 text-sm text-ink"
        />
      </View>

      {/* Form Action Buttons */}
      <View className="flex-row items-center gap-3 pb-6">
        <Pressable
          onPress={onCancel}
          disabled={isSaving}
          className="h-12 flex-1 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
        >
          <Text className="text-sm font-semibold text-ink">Cancel</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={isSaving}
          className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-sm font-bold text-white">Save Changes</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}
