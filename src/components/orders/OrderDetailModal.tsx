// src/components/orders/OrderDetailModal.tsx

import React from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  Text,
  ScrollView,
} from "react-native";
import { X, Edit2 } from "lucide-react-native";
import type {
  OfflineOrderDetailResponse,
  UpdateOfflineOrderPayload,
} from "@/types/offlineSales";
import { OrderDetailView } from "./OrderDetailView";
import { OrderEditView } from "./OrderEditView";

interface OrderDetailModalProps {
  visible: boolean;
  order: OfflineOrderDetailResponse | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onClose: () => void;
  onSaveEdit: (payload: UpdateOfflineOrderPayload) => Promise<void>;
  onCancelOrder: (order: OfflineOrderDetailResponse) => void;
  isSaving?: boolean;
  isCancelling?: boolean;
}

export function OrderDetailModal({
  visible,
  order,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onClose,
  onSaveEdit,
  onCancelOrder,
  isSaving = false,
  isCancelling = false,
}: OrderDetailModalProps) {
  if (!order) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={isEditing ? onCancelEdit : onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable className="flex-1" onPress={isEditing ? onCancelEdit : onClose} />
        <View className="max-h-[90%] rounded-t-3xl border-t border-border bg-background pb-8 pt-5 shadow-2xl">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between border-b border-border px-6 pb-4">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold text-ink">
                  {isEditing ? "Edit Order" : order.order_code}
                </Text>
                {isEditing && (
                  <View className="rounded-md bg-brand/10 px-2 py-0.5">
                    <Text className="text-[10px] font-bold uppercase text-brand">
                      Editing
                    </Text>
                  </View>
                )}
              </View>
              <Text className="mt-0.5 text-xs text-ink-soft">
                {isEditing
                  ? `${order.order_code} • ${order.customer_name}`
                  : `Placed on ${order.order_date}`}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              {!isEditing && (
                <Pressable
                  onPress={onStartEdit}
                  className="flex-row items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 active:opacity-75"
                  hitSlop={8}
                >
                  <Edit2 size={13} color="#e8452c" />
                  <Text className="text-xs font-bold text-brand">Edit</Text>
                </Pressable>
              )}
              <Pressable
                onPress={isEditing ? onCancelEdit : onClose}
                className="h-8 w-8 items-center justify-center rounded-full bg-surface"
                hitSlop={8}
              >
                <X size={16} color="#79726b" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            className="px-6 pt-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isEditing ? (
              <OrderEditView
                order={order}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
                isSaving={isSaving}
              />
            ) : (
              <OrderDetailView
                order={order}
                onEdit={onStartEdit}
                onCancel={onCancelOrder}
                isCancelling={isCancelling}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
