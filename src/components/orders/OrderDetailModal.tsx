// src/components/orders/OrderDetailModal.tsx

import { RecordPaymentModal } from "@/components/payments/RecordPaymentModal";
import { useOfflineOrderDetailQuery } from "@/hooks/useOfflineOrderQueries";
import type {
  OfflineOrderDetailResponse,
  Product,
  UpdateOfflineOrderPayload,
} from "@/types/offlineSales";
import { Edit2, PlusCircle, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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
  products?: Product[];
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
  products,
}: OrderDetailModalProps) {
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  // Query fresh detail when modal is visible
  const { data: detailData, isLoading: isLoadingDetail } =
    useOfflineOrderDetailQuery(
      visible && order?.order_code ? order.order_code : undefined,
    );

  if (!order) return null;

  const activeOrder = detailData || order;

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
        <Pressable
          className="flex-1"
          onPress={isEditing ? onCancelEdit : onClose}
        />
        <View className="max-h-[90%] rounded-t-3xl border-t border-border bg-background pb-8 pt-5 shadow-2xl">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between border-b border-border px-6 pb-4">
            <View className="mr-3 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold text-ink">
                  {isEditing ? "Edit Order" : activeOrder.order_code}
                </Text>
                {isEditing && (
                  <View className="rounded-md bg-brand/10 px-2 py-0.5">
                    <Text className="text-[10px] font-bold uppercase text-brand">
                      Editing
                    </Text>
                  </View>
                )}
              </View>
              {/* <Text className="mt-0.5 text-xs text-ink-soft">
                {isEditing
                  ? `${activeOrder.order_code} • ${activeOrder.customer_name}`
                  : activeOrder.customer_name ||
                    `Customer #${activeOrder.customer}`}
              </Text> */}
            </View>

            <View className="flex-row items-center gap-2">
              {!isEditing &&
                Number(activeOrder.remaining_amount || 0) > 0 &&
                activeOrder.order_status !== "Cancelled" && (
                  <Pressable
                    onPress={() => setPaymentModalVisible(true)}
                    className="flex-row items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 active:opacity-85 shadow-sm"
                    hitSlop={6}
                  >
                    <PlusCircle size={13} color="#ffffff" strokeWidth={2.2} />
                    <Text className="text-xs font-bold text-white">
                      Record Payment
                    </Text>
                  </Pressable>
                )}
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

          {/* Modal Body */}
          <ScrollView
            className="px-6 pt-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isEditing ? (
              <OrderEditView
                order={activeOrder}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
                isSaving={isSaving}
                products={products}
              />
            ) : isLoadingDetail &&
              (!activeOrder.items || activeOrder.items.length === 0) ? (
              <View className="items-center justify-center py-12">
                <ActivityIndicator size="small" color="#e8452c" />
                <Text className="mt-2 text-xs text-ink-soft">
                  Loading order details...
                </Text>
              </View>
            ) : (
              <OrderDetailView
                order={activeOrder}
                onEdit={onStartEdit}
                onCancel={onCancelOrder}
                onRecordPayment={() => setPaymentModalVisible(true)}
                isCancelling={isCancelling}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Record Payment bottom-sheet */}
      <RecordPaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        orderId={activeOrder.id}
        orderCode={activeOrder.order_code}
        remainingAmount={activeOrder.remaining_amount}
        customerId={
          typeof activeOrder.customer === "number"
            ? activeOrder.customer
            : undefined
        }
      />
    </Modal>
  );
}
