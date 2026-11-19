// src/components/orders/OrderDetailModal.tsx

import { RecordPaymentModal } from "@/components/payments/RecordPaymentModal";
import { useOfflineOrderDetailQuery } from "@/hooks/useOfflineOrderQueries";
import type {
  OfflineOrderDetailResponse,
  Product,
  UpdateOfflineOrderPayload,
} from "@/types/offlineSales";
import { Edit2, PlusCircle, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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

const SCREEN_HEIGHT = Dimensions.get("window").height;

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
  const [rendered, setRendered] = useState(visible);
  const isClosingRef = useRef(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const lastOrderRef = useRef(order);
  if (order) {
    lastOrderRef.current = order;
  }
  const displayOrder = order || lastOrderRef.current;

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      setRendered(false);
      onClose();
    });
  };

  const handleDismiss = () => {
    if (isEditing) {
      onCancelEdit();
    } else {
      handleClose();
    }
  };

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setRendered(true);
      backdropAnim.setValue(0);
      sheetAnim.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered && !isClosingRef.current) {
      isClosingRef.current = true;
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        isClosingRef.current = false;
        setRendered(false);
      });
    }
  }, [visible]);

  // Query fresh detail when modal is visible
  const { data: detailData, isLoading: isLoadingDetail } =
    useOfflineOrderDetailQuery(
      visible && displayOrder?.order_code ? displayOrder.order_code : undefined,
    );

  if (!displayOrder && !rendered) return null;

  const activeOrder = detailData || displayOrder!;

  return (
    <Modal
      visible={rendered}
      animationType="none"
      transparent
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
      >
        <Animated.View
          style={{ opacity: backdropAnim }}
          className="absolute inset-0 bg-black/50"
          pointerEvents="none"
        />
        <Pressable className="flex-1" onPress={handleDismiss} />
        <Animated.View
          style={{ transform: [{ translateY: sheetAnim }] }}
          className="max-h-[90%] rounded-t-3xl border-t border-border bg-background pb-8 pt-5"
        >
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
                    className="flex-row items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 active:opacity-85"
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
                onPress={handleDismiss}
                className="h-8 w-8 items-center justify-center rounded-full bg-white border border-border"
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
        </Animated.View>
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
