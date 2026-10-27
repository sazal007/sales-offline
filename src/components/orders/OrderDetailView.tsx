// src/components/orders/OrderDetailView.tsx

import React from "react";
import { View, Text, Pressable, Linking, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Phone, Edit2, XCircle } from "lucide-react-native";
import type { OfflineOrderDetailResponse } from "@/types/offlineSales";
import {
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from "./orderHelpers";

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
  const orderBadge = getOrderStatusBadge(order.order_status);
  const payBadge = getPaymentStatusBadge(order.payment_status);

  return (
    <>
      {/* Status Banner */}
      <View className="mb-4 flex-row items-center justify-between rounded-xl border border-border bg-surface p-3.5">
        <View>
          <Text className="text-[10px] font-bold uppercase text-ink-soft">
            Order Status
          </Text>
          <View className="mt-1 flex-row">
            <View className={`rounded-full border px-2.5 py-0.5 ${orderBadge.bg}`}>
              <Text className={`text-xs font-bold ${orderBadge.text}`}>
                {order.order_status}
              </Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-right text-[10px] font-bold uppercase text-ink-soft">
            Payment Status
          </Text>
          <View className="mt-1 flex-row">
            <View className={`rounded-full border px-2.5 py-0.5 ${payBadge.bg}`}>
              <Text className={`text-xs font-bold ${payBadge.text}`}>
                {order.payment_status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Customer Info Card */}
      <View className="mb-4 rounded-xl border border-border bg-surface p-3.5">
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Customer Details
        </Text>
        <Text className="text-sm font-bold text-ink">
          {order.customer_name}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-soft">
          Contact: {order.customer_contact_person || "—"}
        </Text>
        {Boolean(order.customer_phone) && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}
            className="mt-2 flex-row items-center gap-1.5"
          >
            <Phone size={12} color="#e8452c" />
            <Text className="text-xs font-semibold text-brand">
              {order.customer_phone}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Franchise & Sales Representative */}
      {(Boolean(order.franchise_name) ||
        Boolean(order.sales_person_name)) && (
        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-border bg-surface p-3.5">
          {Boolean(order.franchise_name) && (
            <View className="mr-2 flex-1">
              <Text className="text-[10px] font-bold uppercase text-ink-soft">
                Franchise
              </Text>
              <Text
                className="mt-0.5 text-xs font-semibold text-ink"
                numberOfLines={1}
              >
                {order.franchise_name}
              </Text>
            </View>
          )}
          {Boolean(order.sales_person_name) && (
            <View className="items-end">
              <Text className="text-right text-[10px] font-bold uppercase text-ink-soft">
                Sales Representative
              </Text>
              <Text
                className="mt-0.5 text-right text-xs font-semibold text-ink"
                numberOfLines={1}
              >
                {order.sales_person_name}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Items List */}
      <View className="mb-4 rounded-xl border border-border bg-surface p-3.5">
        <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Items Ordered ({order.items?.length || 0})
        </Text>
        {order.items && order.items.length > 0 ? (
          order.items.map((it, idx) => (
            <View
              key={it.id || idx}
              className="flex-row items-center justify-between border-b border-border/40 py-2 last:border-b-0"
            >
              <View className="flex-1 pr-2">
                <Text className="text-xs font-semibold text-ink">
                  {it.product_name || `Inventory #${it.inventory}`}
                </Text>
              </View>
              <View className="rounded-md border border-border bg-surface-soft px-2 py-0.5">
                <Text className="text-xs font-bold text-ink">
                  x{it.quantity}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-xs text-ink-soft">
            No item breakdown available
          </Text>
        )}
      </View>

      {/* Payment Breakdown */}
      <View className="mb-4 rounded-xl border border-border bg-surface p-3.5">
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Financial Breakdown
        </Text>
        <View className="flex-row justify-between py-1">
          <Text className="text-xs text-ink-soft">Total Amount:</Text>
          <Text className="text-xs font-bold text-ink">
            Rs. {Number(order.total_amount).toLocaleString()}
          </Text>
        </View>
        <View className="flex-row justify-between py-1">
          <Text className="text-xs text-ink-soft">Paid Amount:</Text>
          <Text className="text-xs font-bold text-emerald-600">
            Rs. {Number(order.paid_amount || 0).toLocaleString()}
          </Text>
        </View>
        <View className="mt-1 flex-row justify-between border-t border-border pt-1.5 py-1">
          <Text className="text-xs font-bold text-ink">
            Remaining Balance:
          </Text>
          <Text className="text-xs font-bold text-amber-600">
            Rs. {Number(order.remaining_amount || 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Payment History Records */}
      {order.payment_history && order.payment_history.length > 0 && (
        <View className="mb-4 rounded-xl border border-border bg-surface p-3.5">
          <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Payment History ({order.payment_history.length})
          </Text>
          {order.payment_history.map((ph, idx) => (
            <View
              key={ph.id || idx}
              className="border-b border-border/40 py-2.5 last:border-b-0"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs font-bold text-emerald-600">
                    Rs. {Number(ph.amount).toLocaleString()}
                  </Text>
                  <View className="rounded-md border border-border bg-surface-soft px-1.5 py-0.5">
                    <Text className="text-[10px] font-semibold uppercase text-ink-soft">
                      {ph.payment_method_display || ph.payment_method}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] text-ink-soft">
                  {ph.payment_date}
                </Text>
              </View>
              {Boolean(ph.remarks) && (
                <Text className="mt-1 text-xs text-ink-soft">{ph.remarks}</Text>
              )}
              {Boolean(ph.payment_screenshot) && (
                <View className="mt-2 overflow-hidden rounded-lg border border-border bg-surface-soft">
                  <Image
                    source={{ uri: ph.payment_screenshot || undefined }}
                    className="h-28 w-full"
                    contentFit="contain"
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Remarks */}
      {Boolean(order.remarks) && (
        <View className="mb-4 rounded-xl border border-border bg-surface p-3.5">
          <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Remarks / Notes
          </Text>
          <Text className="text-xs leading-4 text-ink">{order.remarks}</Text>
        </View>
      )}

      {/* Action Buttons: Edit and Cancel */}
      <View className="mb-6 flex-row items-center gap-3">
        <Pressable
          onPress={() => onEdit(order)}
          className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80"
        >
          <Edit2 size={16} color="#ffffff" />
          <Text className="text-sm font-bold text-white">Edit Order</Text>
        </Pressable>

        {order.order_status !== "Cancelled" && (
          <Pressable
            onPress={() => onCancel(order)}
            disabled={isCancelling}
            className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 active:opacity-70"
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#e8452c" />
            ) : (
              <>
                <XCircle size={16} color="#e8452c" />
                <Text className="text-sm font-semibold text-brand">
                  Cancel Order
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </>
  );
}
