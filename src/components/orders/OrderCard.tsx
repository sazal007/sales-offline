// src/components/orders/OrderCard.tsx

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Package, Edit2, Store } from "lucide-react-native";
import type { OfflineOrderDetailResponse } from "@/types/offlineSales";
import { getOrderStatusBadge } from "./orderHelpers";

interface OrderCardProps {
  order: OfflineOrderDetailResponse;
  onPress: (order: OfflineOrderDetailResponse) => void;
  onEdit: (order: OfflineOrderDetailResponse) => void;
}

export function OrderCard({ order, onPress, onEdit }: OrderCardProps) {
  const orderBadge = getOrderStatusBadge(order.order_status);

  return (
    <Pressable
      onPress={() => onPress(order)}
      className="rounded-2xl border border-border bg-surface p-4 shadow-sm active:opacity-90"
    >
      {/* Header: Customer Details (Main Highlight) + Status & Edit Button */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-2.5 pr-2">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
            <Store size={16} color="#e8452c" />
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-base font-bold text-ink">
              {order.customer_name || `Customer #${order.customer}`}
            </Text>
            {Boolean(order.customer_phone) && (
              <Text className="mt-0.5 text-xs text-ink-soft">
                {order.customer_phone}
              </Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEdit(order);
            }}
            className="h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-soft active:bg-brand/10"
            hitSlop={8}
          >
            <Edit2 size={12} color="#79726b" />
          </Pressable>
          <View
            className={`rounded-full border px-2.5 py-0.5 ${orderBadge.bg}`}
          >
            <Text className={`text-[11px] font-bold ${orderBadge.text}`}>
              {order.order_status}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Code & Items Count Row */}
      <View className="mt-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className="h-5 w-5 items-center justify-center rounded-md bg-surface-soft border border-border/70">
            <Package size={11} color="#79726b" />
          </View>
          <Text className="text-xs font-semibold text-ink-soft">
            {order.order_code}
          </Text>
        </View>
        {Boolean(order.items?.length || order.items_count) && (
          <Text className="text-[11px] font-medium text-ink-soft">
            {(order.items?.length || order.items_count)}{" "}
            {(order.items?.length || order.items_count) === 1
              ? "item"
              : "items"}
          </Text>
        )}
      </View>

      {/* Ordered Items Preview */}
      {order.items && order.items.length > 0 && (
        <View className="mt-2.5 rounded-xl border border-border/80 bg-background/60 p-2.5 gap-1.5">
          {order.items.slice(0, 3).map((item, idx) => (
            <View
              key={item.id || idx}
              className="flex-row items-center justify-between"
            >
              <View className="flex-1 flex-row items-center gap-1.5 pr-2">
                <View className="h-1.5 w-1.5 rounded-full bg-brand" />
                <Text
                  numberOfLines={1}
                  className="flex-1 text-xs font-medium text-ink"
                >
                  {item.product_name || `Product #${item.product_id}`}
                </Text>
              </View>
              <Text className="text-xs font-bold text-ink-soft">
                Qty: {item.quantity}
              </Text>
            </View>
          ))}
          {order.items.length > 3 && (
            <Text className="pt-0.5 text-[11px] font-medium text-ink-soft">
              + {order.items.length - 3} more{" "}
              {order.items.length - 3 === 1 ? "item" : "items"}
            </Text>
          )}
        </View>
      )}

      {/* Divider */}
      <View className="my-3 h-px bg-border/60" />

      {/* Amounts Breakdown */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] uppercase font-semibold text-ink-soft">
            Total
          </Text>
          <Text className="text-xs font-bold text-ink">
            Rs. {Number(order.total_amount).toLocaleString()}
          </Text>
        </View>
        <View>
          <Text className="text-[10px] uppercase font-semibold text-ink-soft">
            Paid
          </Text>
          <Text className="text-xs font-bold text-emerald-600">
            Rs. {Number(order.paid_amount || 0).toLocaleString()}
          </Text>
        </View>
        <View>
          <Text className="text-[10px] uppercase font-semibold text-ink-soft">
            Balance
          </Text>
          <Text className="text-xs font-bold text-amber-600">
            Rs. {Number(order.remaining_amount || 0).toLocaleString()}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] uppercase font-semibold text-ink-soft">
            Date
          </Text>
          <Text className="text-xs text-ink-soft">
            {order.order_date || order.created_at?.slice(0, 10)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
