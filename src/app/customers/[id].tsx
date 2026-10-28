// src/app/customers/[id].tsx — Customer Details Screen

import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { RecordPaymentModal } from "@/components/payments/RecordPaymentModal";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import { useAuth } from "@/context/AuthContext";
import {
  useCustomerDetailQuery,
  useDeleteCustomerMutation,
} from "@/hooks/useCustomerQueries";
import {
  useCustomerOrdersQuery,
  useUpdateOfflineOrderMutation,
  useCancelOfflineOrderMutation,
  useProductsQuery,
} from "@/hooks/useOfflineOrderQueries";
import type { OfflineCustomer } from "@/types/customer";
import type {
  OfflineOrderDetailResponse,
  UpdateOfflineOrderPayload,
} from "@/types/offlineSales";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  Pencil,
  Phone,
  PlusCircle,
  Receipt,
  ShoppingBag,
  Store,
  Trash2,
  User,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const customerId = id ? String(id) : "";

  // Query customer details from /api/offline-sales/customers/{id}/
  const {
    data: customer,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useCustomerDetailQuery(customerId);

  const deleteMutation = useDeleteCustomerMutation();

  // Query customer's orders from /api/offline-sales/orders/?customer={id}
  const { data: customerOrders = [], isLoading: isLoadingOrders } =
    useCustomerOrdersQuery(customerId);

  // Order Detail & Edit Modal State
  const [selectedOrder, setSelectedOrder] =
    useState<OfflineOrderDetailResponse | null>(null);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);

  const updateOrderMutation = useUpdateOfflineOrderMutation();
  const cancelOrderMutation = useCancelOfflineOrderMutation();
  const { data: products = [] } = useProductsQuery();

  const handleOpenOrderDetail = (order: OfflineOrderDetailResponse) => {
    setSelectedOrder(order);
    setIsEditingOrder(false);
    setOrderDetailVisible(true);
  };

  const handleCloseOrderDetail = () => {
    setOrderDetailVisible(false);
    setIsEditingOrder(false);
  };

  const handleSaveEditOrder = async (payload: UpdateOfflineOrderPayload) => {
    if (!selectedOrder) return;
    const updated = await updateOrderMutation.mutateAsync({
      orderCode: selectedOrder.order_code,
      payload,
    });
    setSelectedOrder(updated);
    setIsEditingOrder(false);
    Alert.alert(
      "Order Updated",
      `Order ${selectedOrder.order_code} has been successfully updated.`,
    );
  };

  const handleCancelOrder = (order: OfflineOrderDetailResponse) => {
    Alert.alert(
      "Cancel Order",
      `Are you sure you want to cancel order ${order.order_code}? Stock will not be automatically restored if already finalized.`,
      [
        { text: "No, keep it", style: "cancel" },
        {
          text: "Yes, Cancel Order",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelOrderMutation.mutateAsync(order.order_code);
              setOrderDetailVisible(false);
            } catch (err: unknown) {
              const msg =
                err instanceof Error ? err.message : "Failed to cancel order.";
              Alert.alert("Error", msg);
            }
          },
        },
      ],
    );
  };

  if (isAuthLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#e8452c" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Calculations for financial metrics
  const totalOrders = Number(customer?.total_orders_count || 0);
  const totalPurchased = Number(customer?.total_purchased_amount || 0);
  const totalPaid = Number(customer?.total_paid_amount || 0);
  const totalRemaining = Number(customer?.total_remaining_amount || 0);

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert(
        "No Phone Number",
        "This customer has no phone number recorded.",
      );
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", "Unable to open phone dialer");
    });
  };

  const handleDelete = () => {
    if (!customer) return;

    Alert.alert(
      "Delete Customer",
      `Are you sure you want to remove "${customer.store_name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(customer.id);
              router.back();
            } catch (err: unknown) {
              const msg =
                err instanceof Error
                  ? err.message
                  : "Failed to delete customer.";
              Alert.alert("Error", msg);
            }
          },
        },
      ],
    );
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      {/* Top Navigation Bar */}
      <View className="flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
          >
            <ArrowLeft size={18} color="#241a12" strokeWidth={2.2} />
          </Pressable>
        </View>

        {customer && (
          <View className="flex-row items-center gap-2">
            {totalRemaining > 0 && (
              <Pressable
                onPress={() => setPaymentModalVisible(true)}
                hitSlop={4}
                className="flex-row items-center gap-1.5 rounded-xl bg-brand px-3 py-2 shadow-sm active:opacity-85"
              >
                <PlusCircle size={13} color="#ffffff" strokeWidth={2.2} />
                <Text className="text-xs font-bold text-white">
                  Record Payment
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setEditModalVisible(true)}
              hitSlop={6}
              className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
            >
              <Pencil size={15} color="#241a12" />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              hitSlop={6}
              className="h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 active:opacity-70"
            >
              <Trash2 size={15} color="#e8452c" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#e8452c" />
          <Text className="mt-2 text-xs text-ink-soft">
            Loading customer details...
          </Text>
        </View>
      ) : isError || !customer ? (
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={40} color="#e8452c" />
          <Text className="mt-3 text-center text-sm font-semibold text-ink">
            {error instanceof Error
              ? error.message
              : "Failed to load customer details"}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 rounded-xl border border-border bg-surface px-5 py-2.5 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-ink">Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 pb-12 gap-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor="#e8452c"
              colors={["#e8452c"]}
            />
          }
        >
          {/* 1. Store Header & Identity Card */}
          <View className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            {/* Store name + active badge on one compact row */}
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                <Store size={20} color="#e8452c" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-ink">
                  {customer.store_name}
                </Text>
              </View>
              {customer.is_active !== undefined && (
                <View
                  className={`rounded-full px-2.5 py-1 ${
                    customer.is_active
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-gray-100 border border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      customer.is_active ? "text-emerald-700" : "text-gray-600"
                    }`}
                  >
                    {customer.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-3 gap-2">
              {/* Contact Person */}
              <View className="flex-row items-center gap-2">
                <User size={13} color="#79726b" />
                <Text className="text-xs text-ink-soft">
                  {customer.contact_person || "—"}
                </Text>
              </View>

              {/* Phone + Call button */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Phone size={13} color="#79726b" />
                  <Text className="text-xs text-ink-soft">
                    {customer.phone_number || "—"}
                  </Text>
                </View>
                {Boolean(customer.phone_number) && (
                  <Pressable
                    onPress={() => handleCall(customer.phone_number)}
                    className="flex-row items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 active:opacity-75"
                  >
                    <Phone size={11} color="#e8452c" />
                    <Text className="text-[11px] font-bold text-brand">
                      Call
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Address */}
              {Boolean(customer.address) && (
                <View className="flex-row items-start gap-2">
                  <MapPin size={13} color="#79726b" />
                  <Text className="flex-1 text-xs leading-4 text-ink-soft">
                    {customer.address}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 2. Financial Overview Section */}
          <View>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Financial & Sales Overview
              </Text>
              {totalRemaining > 0 && (
                <Pressable
                  onPress={() => setPaymentModalVisible(true)}
                  className="flex-row items-center gap-1.5 rounded-lg bg-brand/10 px-2.5 py-1 active:opacity-75"
                >
                  <PlusCircle size={12} color="#e8452c" strokeWidth={2.2} />
                  <Text className="text-xs font-bold text-brand">
                    Record Payment
                  </Text>
                </Pressable>
              )}
            </View>

            {/* 2x2 Metric Cards Grid */}
            <View className="flex-row flex-wrap gap-3">
              {/* Total Orders Card */}
              <View className="flex-1 min-w-[45%] rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-ink-soft">
                    Total Orders
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                    <ShoppingBag size={14} color="#2563eb" />
                  </View>
                </View>
                <Text className="mt-2 text-xl font-bold text-ink">
                  {totalOrders}
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink-soft">
                  Lifetime orders
                </Text>
              </View>

              {/* Total Purchased Card */}
              <View className="flex-1 min-w-[45%] rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-ink-soft">
                    Total Purchased
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
                    <Receipt size={14} color="#7c3aed" />
                  </View>
                </View>
                <Text className="mt-2 text-xl font-bold text-ink">
                  {formatCurrency(totalPurchased)}
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink-soft">
                  Gross sales value
                </Text>
              </View>

              {/* Total Paid Card */}
              <View className="flex-1 min-w-[45%] rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-ink-soft">
                    Total Paid
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                    <CheckCircle2 size={14} color="#059669" />
                  </View>
                </View>
                <Text className="mt-2 text-xl font-bold text-emerald-600">
                  {formatCurrency(totalPaid)}
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink-soft">
                  Collected amount
                </Text>
              </View>

              {/* Remaining Balance Card */}
              <Pressable
                onPress={() => {
                  if (totalRemaining > 0) setPaymentModalVisible(true);
                }}
                disabled={totalRemaining <= 0}
                className="flex-1 min-w-[45%] rounded-2xl border border-border bg-surface p-3.5 shadow-sm active:opacity-80"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-ink-soft">
                    Remaining Due
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                    <Clock size={14} color="#d97706" />
                  </View>
                </View>
                <Text
                  className={`mt-2 text-xl font-bold ${
                    totalRemaining > 0 ? "text-amber-600" : "text-ink"
                  }`}
                >
                  {formatCurrency(totalRemaining)}
                </Text>
                <View className="mt-0.5 flex-row items-center justify-between">
                  <Text className="text-[11px] text-ink-soft">
                    Outstanding balance
                  </Text>
                  {totalRemaining > 0 && (
                    <Text className="text-[11px] font-bold text-brand">
                      Pay →
                    </Text>
                  )}
                </View>
              </Pressable>
            </View>
          </View>

          {/* 3. Order History Section */}
          <View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Order History ({customerOrders.length})
            </Text>

            {isLoadingOrders ? (
              <View className="items-center justify-center rounded-2xl border border-border bg-surface py-6">
                <ActivityIndicator size="small" color="#e8452c" />
              </View>
            ) : customerOrders.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-8 gap-1.5">
                <Package size={24} color="#79726b" />
                <Text className="text-xs text-ink-soft">No orders yet</Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {customerOrders.map((order) => {
                  const isDelivered = order.order_status === "Delivered";
                  const isCancelled = order.order_status === "Cancelled";
                  const statusTextColor = isDelivered
                    ? "text-emerald-700"
                    : isCancelled
                      ? "text-red-700"
                      : "text-amber-700";
                  const statusBg = isDelivered
                    ? "bg-emerald-50 border-emerald-200"
                    : isCancelled
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200";

                  return (
                    <Pressable
                      key={order.id ?? order.order_code}
                      onPress={() => handleOpenOrderDetail(order)}
                      className="rounded-2xl border border-border bg-surface p-4 shadow-sm active:opacity-85"
                    >
                      {/* Header: order code + status badge */}
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                            <Package size={14} color="#e8452c" />
                          </View>
                          <Text className="text-sm font-bold text-ink">
                            {order.order_code}
                          </Text>
                          <ChevronRight size={14} color="#79726b" />
                        </View>
                        <View
                          className={`rounded-full border px-2.5 py-0.5 ${statusBg}`}
                        >
                          <Text
                            className={`text-[11px] font-bold ${statusTextColor}`}
                          >
                            {order.order_status}
                          </Text>
                        </View>
                      </View>

                      {/* Divider */}
                      <View className="my-3 h-px bg-border/60" />

                      {/* Amounts + Date row */}
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-[10px] font-semibold uppercase text-ink-soft">
                            Total
                          </Text>
                          <Text className="text-xs font-bold text-ink">
                            Rs. {Number(order.total_amount).toLocaleString()}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-[10px] font-semibold uppercase text-ink-soft">
                            Paid
                          </Text>
                          <Text className="text-xs font-bold text-emerald-600">
                            Rs.{" "}
                            {Number(order.paid_amount ?? 0).toLocaleString()}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-[10px] font-semibold uppercase text-ink-soft">
                            Balance
                          </Text>
                          <Text className="text-xs font-bold text-amber-600">
                            Rs.{" "}
                            {Number(
                              order.remaining_amount ?? 0,
                            ).toLocaleString()}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[10px] font-semibold uppercase text-ink-soft">
                            Date
                          </Text>
                          <Text className="text-xs text-ink-soft">
                            {order.order_date}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Edit Customer Form Modal */}
      {customer && (
        <CustomerFormModal
          visible={editModalVisible}
          editingCustomer={customer as OfflineCustomer}
          onClose={() => setEditModalVisible(false)}
        />
      )}

      {/* Record Payment Modal */}
      {customer && (
        <RecordPaymentModal
          visible={paymentModalVisible}
          onClose={() => setPaymentModalVisible(false)}
          customerId={Number(customer.id)}
          remainingAmount={totalRemaining}
          customerOrders={customerOrders
            .filter((o) => Number(o.remaining_amount ?? 0) > 0)
            .map((o) => ({
              id: o.id!,
              order_code: o.order_code,
              remaining_amount: o.remaining_amount ?? "0",
            }))}
        />
      )}

      {/* Order Detail & Edit Modal */}
      <OrderDetailModal
        visible={orderDetailVisible}
        order={selectedOrder}
        isEditing={isEditingOrder}
        onStartEdit={() => setIsEditingOrder(true)}
        onCancelEdit={() => setIsEditingOrder(false)}
        onClose={handleCloseOrderDetail}
        onSaveEdit={handleSaveEditOrder}
        onCancelOrder={handleCancelOrder}
        isSaving={updateOrderMutation.isPending}
        isCancelling={cancelOrderMutation.isPending}
        products={products}
      />
    </SafeAreaView>
  );
}
