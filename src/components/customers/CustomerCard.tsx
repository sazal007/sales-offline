// src/components/customers/CustomerCard.tsx

import React from "react";
import { View, Text, Pressable } from "react-native";
import { Store, Pencil, Trash2, User, Phone, MapPin } from "lucide-react-native";
import type { OfflineCustomer } from "@/types/customer";

interface CustomerCardProps {
  customer: OfflineCustomer;
  onEdit: (customer: OfflineCustomer) => void;
  onDelete: (customer: OfflineCustomer) => void;
  onCall: (phoneNumber: string) => void;
}

export function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onCall,
}: CustomerCardProps) {
  return (
    <View className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      {/* Card Header: Store Name + Edit/Delete actions */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-2.5 pr-2">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
            <Store size={18} color="#e8452c" />
          </View>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-base font-bold text-ink">
              {customer.store_name}
            </Text>
          </View>
        </View>

        {/* Edit & Delete Action Buttons */}
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => onEdit(customer)}
            className="h-8 w-8 items-center justify-center rounded-lg border border-border bg-background active:opacity-70"
            hitSlop={4}
          >
            <Pencil size={13} color="#241a12" />
          </Pressable>
          <Pressable
            onPress={() => onDelete(customer)}
            className="h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 active:opacity-70"
            hitSlop={4}
          >
            <Trash2 size={13} color="#e8452c" />
          </Pressable>
        </View>
      </View>

      {/* Card Divider */}
      <View className="my-3 h-px bg-border/60" />

      {/* Contact Info Rows */}
      <View className="gap-2">
        {/* Contact Person */}
        <View className="flex-row items-center gap-2">
          <User size={14} color="#79726b" />
          <Text className="text-xs font-medium text-ink">
            {customer.contact_person || "—"}
          </Text>
        </View>

        {/* Phone with Quick Call Button */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Phone size={14} color="#79726b" />
            <Text className="text-xs font-medium text-ink">
              {customer.phone_number || "—"}
            </Text>
          </View>
          {Boolean(customer.phone_number) && (
            <Pressable
              onPress={() => onCall(customer.phone_number)}
              className="flex-row items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 active:opacity-70"
            >
              <Phone size={11} color="#e8452c" />
              <Text className="text-[11px] font-semibold text-brand">Call</Text>
            </Pressable>
          )}
        </View>

        {/* Address */}
        <View className="flex-row items-start gap-2 pt-0.5">
          <MapPin size={14} color="#79726b" style={{ marginTop: 1 }} />
          <Text
            numberOfLines={2}
            className="flex-1 text-xs leading-4 text-ink-soft"
          >
            {customer.address || "No address provided"}
          </Text>
        </View>
      </View>
    </View>
  );
}
