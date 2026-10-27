// src/app/(tabs)/orders.tsx — Offline Sales Orders Screen

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react-native";
import {
  useCancelOfflineOrderMutation,
  useOfflineOrdersQuery,
  useProductsQuery,
  useUpdateOfflineOrderMutation,
} from "@/hooks/useOfflineOrderQueries";
import { useCustomersQuery } from "@/hooks/useCustomerQueries";
import type {
  OfflineOrderDetailResponse,
  OfflineOrderStatus,
  UpdateOfflineOrderPayload,
} from "@/types/offlineSales";
import { STATUS_FILTERS } from "@/components/orders/orderHelpers";
import { OrderCard } from "@/components/orders/OrderCard";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import { CreateOrderModal } from "@/components/orders/CreateOrderModal";

export default function OrdersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    OfflineOrderStatus | "All"
  >("All");

  // Modals state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<OfflineOrderDetailResponse | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);

  // Queries & Mutations
  const {
    data: orders = [],
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useOfflineOrdersQuery();

  const { data: customers = [] } = useCustomersQuery();
  const { data: products = [] } = useProductsQuery();

  const updateMutation = useUpdateOfflineOrderMutation();
  const cancelMutation = useCancelOfflineOrderMutation();

  // Filtered orders based on selected status and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (selectedStatus !== "All" && order.order_status !== selectedStatus) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        order.order_code?.toLowerCase().includes(q) ||
        order.customer_name?.toLowerCase().includes(q) ||
        order.customer_phone?.toLowerCase().includes(q) ||
        order.remarks?.toLowerCase().includes(q)
      );
    });
  }, [orders, selectedStatus, searchQuery]);

  // Handlers
  const handleOpenCreateModal = () => {
    setCreateModalVisible(true);
  };

  const handleCardPress = (order: OfflineOrderDetailResponse) => {
    setSelectedOrder(order);
    setIsEditingDetail(false);
    setDetailModalVisible(true);
  };

  const handleCardEdit = (order: OfflineOrderDetailResponse) => {
    setSelectedOrder(order);
    setIsEditingDetail(true);
    setDetailModalVisible(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setIsEditingDetail(false);
  };

  const handleSaveEditOrder = async (payload: UpdateOfflineOrderPayload) => {
    if (!selectedOrder) return;
    const updated = await updateMutation.mutateAsync({
      orderCode: selectedOrder.order_code,
      payload,
    });
    setSelectedOrder(updated);
    setIsEditingDetail(false);
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
              await cancelMutation.mutateAsync(order.order_code);
              setDetailModalVisible(false);
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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="border-b border-border bg-background px-5 pb-3.5 pt-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-ink">Orders</Text>
            <Text className="mt-0.5 text-xs text-ink-soft">
              {orders.length} {orders.length === 1 ? "order" : "orders"}{" "}
              recorded
            </Text>
          </View>
          <Pressable
            onPress={handleOpenCreateModal}
            className="flex-row items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2.5 active:opacity-80"
          >
            <Plus size={16} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-xs font-bold text-white">Create</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="mt-3.5 flex-row items-center rounded-xl border border-border bg-surface px-3.5 py-2.5">
          <Search size={16} color="#79726b" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by order code, customer, or phone..."
            placeholderTextColor="#79726b"
            className="ml-2.5 flex-1 text-sm text-ink"
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <X size={15} color="#79726b" />
            </Pressable>
          )}
        </View>

        {/* Status Filter Horizontal Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-5 px-5 flex-row"
        >
          <View className="flex-row items-center gap-2 pb-0.5">
            {STATUS_FILTERS.map((status) => {
              const isSelected = selectedStatus === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                  className={`rounded-full px-3.5 py-1.5 border ${
                    isSelected
                      ? "border-brand bg-brand"
                      : "border-border bg-surface active:bg-surface-soft"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-ink-soft"
                    }`}
                  >
                    {status}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#e8452c" />
          <Text className="mt-2 text-xs text-ink-soft">
            Loading offline sales orders...
          </Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={36} color="#e8452c" />
          <Text className="mt-3 text-center text-sm font-semibold text-ink">
            {error instanceof Error ? error.message : "Failed to load orders"}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-5 py-2.5 active:opacity-80"
          >
            <RefreshCw size={14} color="#241a12" />
            <Text className="text-xs font-semibold text-ink">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id || item.order_code)}
          contentContainerClassName="p-5 pb-16"
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
          ItemSeparatorComponent={() => <View className="h-3.5" />}
          ListEmptyComponent={
            <View className="mt-12 items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                <Package size={22} color="#e8452c" />
              </View>
              <Text className="font-semibold text-ink">
                {searchQuery.trim() || selectedStatus !== "All"
                  ? "No matching orders"
                  : "No offline orders yet"}
              </Text>
              <Text className="mt-1 text-center text-xs text-ink-soft">
                {searchQuery.trim() || selectedStatus !== "All"
                  ? "Try adjusting your filter or search query"
                  : "Tap 'Create' to record your first offline delivery order."}
              </Text>
              {!searchQuery.trim() && selectedStatus === "All" && (
                <Pressable
                  onPress={handleOpenCreateModal}
                  className="mt-4 flex-row items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 active:opacity-80"
                >
                  <Plus size={15} color="#ffffff" strokeWidth={2.5} />
                  <Text className="text-xs font-bold text-white">
                    Create Order
                  </Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={handleCardPress}
              onEdit={handleCardEdit}
            />
          )}
        />
      )}

      {/* Order Detail & Edit Modal */}
      <OrderDetailModal
        visible={detailModalVisible}
        order={selectedOrder}
        isEditing={isEditingDetail}
        onStartEdit={() => setIsEditingDetail(true)}
        onCancelEdit={() => setIsEditingDetail(false)}
        onClose={handleCloseDetailModal}
        onSaveEdit={handleSaveEditOrder}
        onCancelOrder={handleCancelOrder}
        isSaving={updateMutation.isPending}
        isCancelling={cancelMutation.isPending}
      />

      {/* Create Order Modal */}
      <CreateOrderModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        customers={customers}
        products={products}
      />
    </SafeAreaView>
  );
}
