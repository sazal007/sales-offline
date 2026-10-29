// src/components/payments/RecordPaymentModal.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Banknote,
  Camera,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  ImageIcon,
  Landmark,
  QrCode,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRecordOfflinePaymentMutation } from "@/hooks/useOfflineOrderQueries";
import type { OfflinePaymentMethod } from "@/types/offlineSales";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderOption {
  id: number;
  order_code: string;
  remaining_amount: string | number;
}

interface RecordPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pass when recording from Order detail — locks order context */
  orderId?: number;
  orderCode?: string;
  remainingAmount?: string | number;
  /** Pass when recording from Customer detail — shows order picker */
  customerId?: number;
  customerOrders?: OrderOption[];
}

// ─── Payment method options ───────────────────────────────────────────────────

const PAYMENT_METHODS: { value: OfflinePaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "cash",          label: "Cash",          icon: <Banknote   size={15} color="#241a12" /> },
  { value: "online",        label: "Online / QR",   icon: <QrCode     size={15} color="#241a12" /> },
  { value: "cheque",        label: "Cheque",        icon: <CreditCard size={15} color="#241a12" /> },
  { value: "bank_transfer", label: "Bank Transfer", icon: <Landmark   size={15} color="#241a12" /> },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function RecordPaymentModal({
  visible,
  onClose,
  orderId,
  orderCode,
  remainingAmount,
  customerId,
  customerOrders = [],
}: RecordPaymentModalProps) {
  const mutation = useRecordOfflinePaymentMutation();

  // Form state
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<OfflinePaymentMethod>("cash");
  const [remarks, setRemarks] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setAmount("");
      setMethod("cash");
      setRemarks("");
      setPaymentScreenshot(null);
      setScreenshotError(null);
      setSelectedOrder(null);
      setShowOrderPicker(false);
      mutation.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
        setScreenshotError(null);
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
        setScreenshotError(null);
      }
    } catch {
      Alert.alert("Error", "Could not take photo. Please try again.");
    }
  };

  const handleMethodSelect = (selectedMethod: OfflinePaymentMethod) => {
    setMethod(selectedMethod);
    if (selectedMethod === "cash") {
      setPaymentScreenshot(null);
      setScreenshotError(null);
    }
  };

  // Derive the effective remaining balance:
  // If an order is selected -> capped at that order's remaining due (and customer remaining due if provided)
  // If no order is selected -> capped at the customer's total remaining due
  const effectiveRemaining = useMemo(() => {
    if (selectedOrder) {
      const orderRemaining = Number(selectedOrder.remaining_amount || 0);
      if (remainingAmount !== undefined && remainingAmount !== null) {
        const custRemaining = Number(remainingAmount || 0);
        return custRemaining > 0 ? Math.min(orderRemaining, custRemaining) : orderRemaining;
      }
      return orderRemaining;
    }
    if (remainingAmount !== undefined && remainingAmount !== null) {
      return Number(remainingAmount || 0);
    }
    return null;
  }, [selectedOrder, remainingAmount]);

  const parsedAmount = Number(amount || 0);
  const isOverpaying =
    effectiveRemaining !== null && parsedAmount > effectiveRemaining;
  const isAmountValid = parsedAmount > 0 && !isOverpaying;

  // Context: in order mode we have a fixed order; in customer mode the user picks one
  const isOrderMode = Boolean(orderId || orderCode);

  const handleSubmit = async () => {
    if (isOverpaying) {
      Alert.alert(
        "Amount Exceeds Due",
        `The entered payment amount (Rs. ${parsedAmount.toLocaleString()}) cannot cross the remaining due of Rs. ${effectiveRemaining?.toLocaleString()}.`,
      );
      return;
    }

    if (!isAmountValid) {
      Alert.alert("Invalid Amount", "Please enter an amount greater than 0.");
      return;
    }

    if (method !== "cash" && !paymentScreenshot) {
      const methodName =
        PAYMENT_METHODS.find((p) => p.value === method)?.label || method;
      const errorMsg = `Payment screenshot is compulsory for ${methodName} payments.`;
      setScreenshotError(errorMsg);
      Alert.alert("Screenshot Required", errorMsg);
      return;
    }

    // Build payload
    const payload: Parameters<typeof mutation.mutateAsync>[0] = {
      amount: parsedAmount.toFixed(2),
      payment_method: method,
      remarks: remarks.trim() || undefined,
      ...(method !== "cash" && paymentScreenshot
        ? { payment_screenshot: paymentScreenshot }
        : {}),
    };

    if (isOrderMode) {
      if (orderId)    payload.order      = orderId;
      if (orderCode)  payload.order_code = orderCode;
      if (customerId) payload.customer   = customerId;
    } else {
      // Customer mode
      payload.customer = customerId;
      if (selectedOrder) {
        payload.order      = selectedOrder.id;
        payload.order_code = selectedOrder.order_code;
      }
    }

    try {
      await mutation.mutateAsync(payload);
      Alert.alert("Payment Recorded", `Rs. ${parsedAmount.toLocaleString()} has been recorded successfully.`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record payment.";
      Alert.alert("Error", msg);
    }
  };

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

        <View className="max-h-[88%] rounded-t-3xl border-t border-border bg-background pb-10 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
            <View>
              <Text className="text-base font-bold text-ink">
                Record Payment
              </Text>
              <Text className="mt-0.5 text-xs text-ink-soft">
                {isOrderMode
                  ? `Order: ${orderCode ?? `#${orderId}`}`
                  : "Customer credit payment"}
              </Text>
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
            <View className="gap-4 pb-8">

              {/* Remaining balance chip */}
              {effectiveRemaining !== null && (
                <View className="flex-row items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <View>
                    <Text className="text-xs font-semibold text-amber-800">
                      {selectedOrder
                        ? `Order Due (${selectedOrder.order_code})`
                        : isOrderMode
                          ? `Order Remaining Due`
                          : `Customer Remaining Due`}
                    </Text>
                    <Text className="text-[10px] text-amber-700/80">
                      Maximum payment allowed
                    </Text>
                  </View>
                  <Text className="text-sm font-bold text-amber-900">
                    Rs. {effectiveRemaining.toLocaleString()}
                  </Text>
                </View>
              )}

              {/* Order Picker — only in customer mode */}
              {!isOrderMode && customerOrders.length > 0 && (
                <View>
                  <Text className="mb-1.5 text-xs font-semibold text-ink-soft">
                    Apply to Order (optional)
                  </Text>
                  <Pressable
                    onPress={() => setShowOrderPicker((v) => !v)}
                    className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 active:opacity-75"
                  >
                    <Text className={`text-sm ${selectedOrder ? "font-semibold text-ink" : "text-ink-soft"}`}>
                      {selectedOrder
                        ? `${selectedOrder.order_code}  (Rs. ${Number(selectedOrder.remaining_amount).toLocaleString()} due)`
                        : "General payment — no specific order"}
                    </Text>
                    <ChevronDown size={15} color="#79726b" />
                  </Pressable>

                  {showOrderPicker && (
                    <View className="mt-1.5 rounded-xl border border-border bg-surface overflow-hidden">
                      {/* No specific order */}
                      <Pressable
                        onPress={() => {
                          setSelectedOrder(null);
                          setShowOrderPicker(false);
                        }}
                        className="flex-row items-center justify-between px-3.5 py-3 border-b border-border/60 active:bg-background"
                      >
                        <Text className="text-xs font-medium text-ink-soft">
                          General payment (no order)
                        </Text>
                        {!selectedOrder && <CheckCircle2 size={14} color="#059669" />}
                      </Pressable>

                      {customerOrders
                        .filter((o) => Number(o.remaining_amount) > 0)
                        .map((o) => (
                          <Pressable
                            key={o.id}
                            onPress={() => {
                              setSelectedOrder(o);
                              setShowOrderPicker(false);
                              // Pre-fill amount with order's remaining
                              setAmount(String(Number(o.remaining_amount)));
                            }}
                            className="flex-row items-center justify-between px-3.5 py-3 border-b border-border/60 active:bg-background"
                          >
                            <View>
                              <Text className="text-sm font-semibold text-ink">
                                {o.order_code}
                              </Text>
                              <Text className="text-[11px] text-ink-soft">
                                Due: Rs. {Number(o.remaining_amount).toLocaleString()}
                              </Text>
                            </View>
                            {selectedOrder?.id === o.id && (
                              <CheckCircle2 size={14} color="#059669" />
                            )}
                          </Pressable>
                        ))}
                    </View>
                  )}
                </View>
              )}

              {/* Amount */}
              <View>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-ink-soft">
                    Payment Amount (Rs.) *
                  </Text>
                  {effectiveRemaining !== null && effectiveRemaining > 0 && (
                    <Pressable
                      onPress={() => setAmount(String(effectiveRemaining))}
                      hitSlop={6}
                      className="rounded-md bg-brand/10 px-2 py-0.5 active:opacity-70"
                    >
                      <Text className="text-[11px] font-bold text-brand">
                        Fill Max (Rs. {effectiveRemaining.toLocaleString()})
                      </Text>
                    </Pressable>
                  )}
                </View>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#79726b"
                  className={`rounded-xl border px-3.5 py-3 text-sm font-semibold text-ink ${
                    isOverpaying
                      ? "border-red-500 bg-red-50/20"
                      : "border-border bg-surface"
                  }`}
                />
                {isOverpaying && (
                  <Text className="mt-1 text-xs font-medium text-red-600">
                    Amount cannot exceed remaining due of Rs.{" "}
                    {effectiveRemaining?.toLocaleString()}.
                  </Text>
                )}
              </View>

              {/* Payment Method */}
              <View>
                <Text className="mb-1.5 text-xs font-semibold text-ink-soft">
                  Payment Method *
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <Pressable
                      key={pm.value}
                      onPress={() => handleMethodSelect(pm.value)}
                      className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-2.5 active:opacity-75 ${
                        method === pm.value
                          ? "border-brand bg-brand/10"
                          : "border-border bg-surface"
                      }`}
                    >
                      {pm.icon}
                      <Text
                        className={`text-xs font-semibold ${
                          method === pm.value ? "text-brand" : "text-ink"
                        }`}
                      >
                        {pm.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Payment Screenshot (compulsory for non-cash) */}
              {method !== "cash" && (
                <View
                  className={`rounded-2xl border ${
                    screenshotError
                      ? "border-red-500 bg-red-50/30"
                      : "border-dashed border-border bg-background"
                  } p-3.5`}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-1.5">
                      <DollarSign size={14} color="#e8452c" />
                      <Text className="text-xs font-bold text-ink">
                        Payment Screenshot / Receipt *
                      </Text>
                    </View>
                    <View className="rounded bg-red-100 px-2 py-0.5 border border-red-200">
                      <Text className="text-[10px] font-bold text-red-700 uppercase">
                        Compulsory
                      </Text>
                    </View>
                  </View>

                  {paymentScreenshot ? (
                    <View className="rounded-xl border border-border bg-surface p-2.5">
                      <View className="relative">
                        <Image
                          source={{ uri: paymentScreenshot.uri }}
                          className="h-36 w-full rounded-lg"
                          contentFit="contain"
                        />
                        <View className="mt-2 flex-row items-center justify-between">
                          <Text
                            numberOfLines={1}
                            className="text-xs font-semibold text-ink flex-1 mr-2"
                          >
                            {paymentScreenshot.name}
                          </Text>
                          <View className="flex-row items-center gap-1.5">
                            <Pressable
                              onPress={handlePickImage}
                              className="flex-row items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 active:opacity-70"
                            >
                              <RefreshCw size={11} color="#79726b" />
                              <Text className="text-[11px] font-semibold text-ink">
                                Change
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setPaymentScreenshot(null);
                                setScreenshotError(null);
                              }}
                              className="flex-row items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 active:opacity-70"
                            >
                              <Trash2 size={11} color="#e8452c" />
                              <Text className="text-[11px] font-semibold text-brand">
                                Remove
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View className="items-center py-2">
                      <Text className="text-xs text-ink-soft text-center mb-2.5">
                        Please upload receipt or QR confirmation screenshot
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          onPress={handlePickImage}
                          className="flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 shadow-sm active:opacity-75"
                        >
                          <ImageIcon size={14} color="#241a12" />
                          <Text className="text-xs font-semibold text-ink">
                            Gallery
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleTakePhoto}
                          className="flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 shadow-sm active:opacity-75"
                        >
                          <Camera size={14} color="#241a12" />
                          <Text className="text-xs font-semibold text-ink">
                            Camera
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {Boolean(screenshotError) && (
                    <Text className="mt-2 text-xs font-medium text-red-500">
                      {screenshotError}
                    </Text>
                  )}
                </View>
              )}

              {/* Remarks */}
              <View>
                <Text className="mb-1.5 text-xs font-semibold text-ink-soft">
                  Remarks / Reference (optional)
                </Text>
                <TextInput
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="e.g. Fonepay ref, cheque no..."
                  placeholderTextColor="#79726b"
                  multiline
                  numberOfLines={2}
                  className="rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-ink"
                  style={{ minHeight: 64, textAlignVertical: "top" }}
                />
              </View>

              {/* Submit button */}
              <Pressable
                onPress={handleSubmit}
                disabled={!isAmountValid || mutation.isPending}
                className={`h-12 flex-row items-center justify-center gap-2 rounded-xl ${
                  isAmountValid &&
                  !mutation.isPending &&
                  (method === "cash" || Boolean(paymentScreenshot))
                    ? "bg-brand active:opacity-85"
                    : "bg-brand/40"
                }`}
              >
                {mutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#ffffff" />
                    <Text className="text-sm font-bold text-white">
                      Confirm Payment
                      {parsedAmount > 0 ? `  •  Rs. ${parsedAmount.toLocaleString()}` : ""}
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

