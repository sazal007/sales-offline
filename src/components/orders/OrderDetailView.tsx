// src/components/orders/OrderDetailView.tsx

import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import {
  Clock,
  CreditCard,
  Edit2,
  FileText,
  Package,
  Phone,
  Store,
  User,
  XCircle,
} from "lucide-react-native";
import type { OfflineOrderDetailResponse } from "@/types/offlineSales";

interface OrderDetailViewProps {
  order: OfflineOrderDetailResponse;
  onEdit: (order: OfflineOrderDetailResponse) => void;
  onCancel: (order: OfflineOrderDetailResponse) => void;
  isCancelling?: boolean;
}

export function OrderDetailView({
  order,
  onEdit,
  onCancel,
  isCancelling = false,
}: OrderDetailViewProps) {
  const totalAmount = Number(order.total_amount || 0);
  const paidAmount = Number(order.paid_amount || 0);
  const remainingAmount = Number(order.remaining_amount || 0);

  const { paidPercentage, remainingPercentage } = useMemo(() => {
    if (totalAmount <= 0) {
      return { paidPercentage: 100, remainingPercentage: 0 };
    }
    const paidPct = Math.min(
      100,
      Math.max(0, Math.round((paidAmount / totalAmount) * 100)),
    );
    return {
      paidPercentage: paidPct,
      remainingPercentage: 100 - paidPct,
    };
  }, [totalAmount, paidAmount]);

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "This customer has no phone number recorded.");
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", "Unable to open phone dialer");
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return (
        d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }) +
        " • " +
        d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  return (
    <View className="gap-4 pb-8">
      {/* 1. Customer & Store Info Card */}
      <View className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3 pr-2">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
              <Store size={20} color="#e8452c" />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-base font-bold text-ink">
                {order.customer_name || `Customer #${order.customer}`}
              </Text>
              {Boolean(order.customer_contact_person) && (
                <View className="mt-0.5 flex-row items-center gap-1.5">
                  <User size={12} color="#79726b" />
                  <Text className="text-xs text-ink-soft">
                    {order.customer_contact_person}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {Boolean(order.customer_phone) && (
            <Pressable
              onPress={() => handleCall(order.customer_phone)}
              className="flex-row items-center gap-1.5 rounded-xl bg-brand/10 px-3 py-1.5 active:opacity-75"
            >
              <Phone size={12} color="#e8452c" />
              <Text className="text-xs font-bold text-brand">Call</Text>
            </Pressable>
          )}
        </View>

        {Boolean(order.customer_phone) && (
          <View className="mt-2.5 flex-row items-center gap-2 border-t border-border/60 pt-2.5">
            <Phone size={12} color="#79726b" />
            <Text className="text-xs font-medium text-ink">
              {order.customer_phone}
            </Text>
          </View>
        )}
      </View>

      {/* 2. Financial Breakdown Section */}
      <View>
        <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
          Financial Breakdown
        </Text>

        {/* 3-card row: Total, Paid, Balance */}
        <View className="flex-row gap-2.5">
          {/* Total Amount */}
          <View className="flex-1 rounded-2xl border border-border bg-surface p-3 shadow-sm">
            <Text className="text-[11px] font-medium text-ink-soft">Total</Text>
            <Text className="mt-1 text-base font-bold text-ink">
              {formatCurrency(totalAmount)}
            </Text>
          </View>

          {/* Paid Amount */}
          <View className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 shadow-sm">
            <Text className="text-[11px] font-semibold text-emerald-800">
              Paid
            </Text>
            <Text className="mt-1 text-base font-bold text-emerald-800">
              {formatCurrency(paidAmount)}
            </Text>
          </View>

          {/* Remaining Balance */}
          <View
            className={`flex-1 rounded-2xl border p-3 shadow-sm ${
              remainingAmount > 0
                ? "border-amber-200 bg-amber-50/70"
                : "border-border bg-surface"
            }`}
          >
            <Text
              className={`text-[11px] font-semibold ${
                remainingAmount > 0 ? "text-amber-800" : "text-ink-soft"
              }`}
            >
              Balance
            </Text>
            <Text
              className={`mt-1 text-base font-bold ${
                remainingAmount > 0 ? "text-amber-900" : "text-ink"
              }`}
            >
              {formatCurrency(remainingAmount)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        {totalAmount > 0 && (
          <View className="mt-2.5 rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-ink">
                Payment Fulfillment
              </Text>
              <Text className="text-xs font-bold text-brand">
                {paidPercentage}% Paid
              </Text>
            </View>

            <View className="mt-2 h-2 w-full flex-row overflow-hidden rounded-full bg-border">
              <View
                style={{ width: `${paidPercentage}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
              {remainingPercentage > 0 && (
                <View
                  style={{ width: `${remainingPercentage}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              )}
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full bg-emerald-500" />
                <Text className="text-[11px] font-medium text-ink-soft">
                  Paid: {formatCurrency(paidAmount)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-full bg-amber-500" />
                <Text className="text-[11px] font-medium text-ink-soft">
                  Due: {formatCurrency(remainingAmount)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 3. Items Ordered */}
      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Items Ordered ({order.items?.length || 0})
          </Text>
          <Text className="text-xs font-semibold text-ink-soft">
            Total Qty:{" "}
            {order.items?.reduce(
              (sum, it) => sum + (Number(it.quantity) || 0),
              0,
            ) || 0}
          </Text>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm gap-2.5">
          {order.items && order.items.length > 0 ? (
            order.items.map((it, idx) => (
              <View
                key={it.id || idx}
                className="flex-row items-center justify-between rounded-xl border border-border bg-background p-3"
              >
                <View className="flex-1 flex-row items-center gap-3 pr-2">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                    <Package size={18} color="#e8452c" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-ink">
                      {it.product_name || `Inventory #${it.inventory}`}
                    </Text>
                    <Text className="mt-0.5 text-xs text-ink-soft">
                      Inventory #{it.inventory} • Product ID #{it.product_id}
                    </Text>
                  </View>
                </View>

                <View className="rounded-xl border border-border bg-surface px-3 py-1.5">
                  <Text className="text-xs font-bold text-ink">
                    Qty: {it.quantity}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View className="items-center py-4">
              <Package size={24} color="#79726b" />
              <Text className="mt-1 text-xs text-ink-soft">
                No items listed for this order
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 4. Payment History */}
      <View>
        <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
          Payment History ({order.payment_history?.length || 0})
        </Text>

        {order.payment_history && order.payment_history.length > 0 ? (
          <View className="gap-2.5">
            {order.payment_history.map((ph, idx) => (
              <View
                key={ph.id || idx}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                {/* Amount & Method Header */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                      <CreditCard size={15} color="#059669" />
                    </View>
                    <Text className="text-base font-bold text-emerald-800">
                      {formatCurrency(Number(ph.amount))}
                    </Text>
                  </View>

                  <View className="rounded-lg border border-border bg-background px-2.5 py-1">
                    <Text className="text-[11px] font-bold uppercase text-ink">
                      {ph.payment_method_display || ph.payment_method}
                    </Text>
                  </View>
                </View>

                {/* Date & Recorded By */}
                <View className="mt-3 flex-row items-center justify-between border-t border-border/60 pt-2.5">
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={12} color="#79726b" />
                    <Text className="text-xs text-ink-soft">
                      {formatDateTime(ph.payment_date || ph.created_at)}
                    </Text>
                  </View>

                  {Boolean(ph.recorded_by_name) && (
                    <Text className="text-xs text-ink-soft">
                      By {ph.recorded_by_name}
                    </Text>
                  )}
                </View>

                {/* Remarks */}
                {Boolean(ph.remarks) && (
                  <View className="mt-2.5 rounded-xl border border-border/70 bg-background px-3 py-2 flex-row items-center gap-2">
                    <FileText size={12} color="#79726b" />
                    <Text className="flex-1 text-xs text-ink-soft italic">
                      "{ph.remarks}"
                    </Text>
                  </View>
                )}

                {/* Payment Screenshot */}
                {Boolean(ph.payment_screenshot) && (
                  <View className="mt-2.5 overflow-hidden rounded-xl border border-border bg-background">
                    <Image
                      source={{ uri: ph.payment_screenshot || undefined }}
                      className="h-36 w-full"
                      contentFit="contain"
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View className="rounded-2xl border border-border bg-surface p-6 items-center justify-center">
            <CreditCard size={24} color="#79726b" />
            <Text className="mt-1 text-xs text-ink-soft">
              No payment transactions recorded yet
            </Text>
          </View>
        )}
      </View>

      {/* 5. Remarks / Notes */}
      {Boolean(order.remarks) && (
        <View className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
          <View className="flex-row items-center gap-2">
            <FileText size={14} color="#79726b" />
            <Text className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Order Remarks
            </Text>
          </View>
          <Text className="mt-2 text-xs leading-5 text-ink">
            {order.remarks}
          </Text>
        </View>
      )}

      {/* 6. Action Buttons */}
      <View className="mt-2 flex-row items-center gap-3">
        <Pressable
          onPress={() => onEdit(order)}
          className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-85"
        >
          <Edit2 size={15} color="#ffffff" strokeWidth={2.2} />
          <Text className="text-sm font-bold text-white">Edit Order</Text>
        </Pressable>

        {order.order_status !== "Cancelled" && (
          <Pressable
            onPress={() => onCancel(order)}
            disabled={isCancelling}
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 active:opacity-75"
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#e8452c" />
            ) : (
              <>
                <XCircle size={15} color="#e8452c" strokeWidth={2.2} />
                <Text className="text-sm font-bold text-brand">
                  Cancel Order
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
