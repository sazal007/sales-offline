// src/app/(tabs)/orders.tsx — Offline Sales Orders Screen

import { useCustomersQuery } from "@/hooks/useCustomerQueries";
import {
  useCancelOfflineOrderMutation,
  useCreateOfflineOrderMutation,
  useOfflineOrdersQuery,
  useProductsQuery,
  useUpdateOfflineOrderMutation,
} from "@/hooks/useOfflineOrderQueries";
import type {
  OfflineOrderDetailResponse,
  OfflineOrderStatus,
  OfflinePaymentMethod,
  Product,
  UpdateOfflineOrderPayload,
} from "@/types/offlineSales";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Edit2,
  ImageIcon,
  Minus,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUS_FILTERS: (OfflineOrderStatus | "All")[] = [
  "All",
  "Pending",
  "Confirmed",
  "Delivered",
  "Cancelled",
];

const PAYMENT_METHODS: { key: OfflinePaymentMethod; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "online", label: "Online / QR" },
  { key: "cheque", label: "Cheque" },
  { key: "bank_transfer", label: "Bank Transfer" },
];

export interface SelectedOrderItem {
  inventory_id: number;
  quantity: number;
  product?: Product;
}

export default function OrdersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    OfflineOrderStatus | "All"
  >("All");

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<OfflineOrderDetailResponse | null>(null);

  // Edit Order state
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [editPaidAmount, setEditPaidAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] =
    useState<OfflinePaymentMethod>("cash");
  const [editRemarks, setEditRemarks] = useState("");
  const [editOrderDate, setEditOrderDate] = useState("");
  const [editDateObject, setEditDateObject] = useState<Date>(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editPaymentScreenshot, setEditPaymentScreenshot] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>(
    {},
  );
  const [editApiError, setEditApiError] = useState<string | null>(null);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [dateObject, setDateObject] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [items, setItems] = useState<SelectedOrderItem[]>([
    { inventory_id: 0, quantity: 1 },
  ]);
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] =
    useState<OfflinePaymentMethod>("cash");
  const [remarks, setRemarks] = useState<string>("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Customer dropdown picker state
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

  // Product dropdown picker state
  const [openProductDropdownIndex, setOpenProductDropdownIndex] = useState<
    number | null
  >(null);
  const [productSearch, setProductSearch] = useState("");

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
  const { data: products = [], isLoading: isLoadingProducts } =
    useProductsQuery();

  const createMutation = useCreateOfflineOrderMutation();
  const updateMutation = useUpdateOfflineOrderMutation();
  const cancelMutation = useCancelOfflineOrderMutation();

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (selectedStatus !== "All" && order.order_status !== selectedStatus) {
        return false;
      }
      // Search query filter
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

  // Filtered products for selection
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.product_name?.toLowerCase().includes(q) ||
        String(p.inventory_id).includes(q) ||
        String(p.product_id).includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  // Auto calculated total sum
  const calculatedTotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const price = it.product?.total_amount || 0;
      return acc + price * it.quantity;
    }, 0);
  }, [items]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const now = new Date();
    setSelectedCustomerId(customers[0]?.id ? Number(customers[0].id) : null);
    setDateObject(now);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setOrderDate(`${y}-${m}-${d}`);
    setShowDatePicker(false);

    const initialProduct = products[0];
    setItems([
      {
        inventory_id: initialProduct
          ? (initialProduct.inventory_id ?? initialProduct.product_id)
          : 0,
        quantity: 1,
        product: initialProduct,
      },
    ]);
    if (initialProduct?.total_amount) {
      setTotalAmount(String(initialProduct.total_amount));
    } else {
      setTotalAmount("");
    }
    setPaidAmount("0");
    setPaymentMethod("cash");
    setRemarks("");
    setPaymentScreenshot(null);
    setFormErrors({});
    setApiError(null);
    setOpenProductDropdownIndex(null);
    setCreateModalVisible(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalVisible(false);
    setShowDatePicker(false);
    setOpenProductDropdownIndex(null);
    setPaymentScreenshot(null);
    setFormErrors({});
    setApiError(null);
    setCustomerPickerOpen(false);
  };

  // Item Management inside Form
  const handleAddItem = () => {
    const unusedProduct =
      products.find(
        (p) =>
          !items.some(
            (it) => it.inventory_id === (p.inventory_id ?? p.product_id),
          ),
      ) || products[0];

    const invId = unusedProduct
      ? (unusedProduct.inventory_id ?? unusedProduct.product_id)
      : 0;

    setItems((prev) => [
      ...prev,
      {
        inventory_id: invId,
        quantity: 1,
        product: unusedProduct,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (openProductDropdownIndex === index) {
      setOpenProductDropdownIndex(null);
    }
  };

  const handleUpdateItem = (
    index: number,
    field: "inventory_id" | "quantity",
    value: number,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSelectProduct = (index: number, product: Product) => {
    setItems((prev) => {
      const updated = [...prev];
      const currentQty = updated[index]?.quantity || 1;
      const invId = product.inventory_id ?? product.product_id;
      updated[index] = {
        inventory_id: invId,
        quantity: currentQty,
        product,
      };

      // Auto update totalAmount if product has price
      const newTotal = updated.reduce((acc, it) => {
        const price = it.product?.total_amount || 0;
        return acc + price * it.quantity;
      }, 0);
      if (newTotal > 0 && (!totalAmount || totalAmount === "0")) {
        setTotalAmount(String(newTotal));
      }

      return updated;
    });
    setOpenProductDropdownIndex(null);
    setProductSearch("");
  };

  // Image picker for payment screenshot
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
        setFormErrors((prev) => {
          const n = { ...prev };
          delete n.payment_screenshot;
          return n;
        });
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
        setFormErrors((prev) => {
          const n = { ...prev };
          delete n.payment_screenshot;
          return n;
        });
      }
    } catch {
      Alert.alert("Error", "Could not take photo. Please try again.");
    }
  };

  // Remaining balance calculation
  const calculatedRemaining = useMemo(() => {
    const tot = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    return Math.max(0, tot - paid);
  }, [totalAmount, paidAmount]);

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedCustomerId) {
      errors.customer = "Please select a customer";
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      errors.total_amount = "Valid total amount is required";
    }

    const tot = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;

    if (paid < 0) {
      errors.paid_amount = "Paid amount cannot be negative";
    }

    if (paid > tot) {
      errors.paid_amount = "Paid amount cannot exceed total amount";
    }

    if (items.length === 0) {
      errors.items = "At least one order item is required";
    } else {
      const invalidItem = items.some(
        (it) => !it.inventory_id || it.inventory_id <= 0 || it.quantity <= 0,
      );
      if (invalidItem) {
        errors.items = "Please select a product and quantity > 0 for each item";
      }
    }

    // Screenshot required for non-cash payment methods when paid amount > 0
    if (paymentMethod !== "cash" && paid > 0 && !paymentScreenshot) {
      errors.payment_screenshot = `A screenshot is required for ${
        PAYMENT_METHODS.find((p) => p.key === paymentMethod)?.label ||
        paymentMethod
      } payments`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Order
  const handleSubmitOrder = async () => {
    if (!validateForm()) return;
    setApiError(null);

    const payload = {
      customer: Number(selectedCustomerId),
      order_date: orderDate,
      total_amount: totalAmount.trim(),
      paid_amount: paidAmount.trim() || "0.00",
      payment_method: paymentMethod,
      remarks: remarks.trim() || undefined,
      items: items.map((it) => ({
        inventory_id: Number(it.inventory_id),
        quantity: Number(it.quantity),
      })),
      ...(paymentScreenshot ? { payment_screenshot: paymentScreenshot } : {}),
    };

    try {
      await createMutation.mutateAsync(payload);
      handleCloseCreateModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order.";
      setApiError(msg);
    }
  };

  // Cancel Order
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

  // Open Edit Mode inside Detail Modal
  const handleOpenEditModal = (order: OfflineOrderDetailResponse) => {
    setSelectedOrder(order);
    setEditTotalAmount(String(order.total_amount || ""));
    setEditPaidAmount(String(order.paid_amount || "0"));

    // Default payment method from latest payment history if present
    const lastPayment =
      order.payment_history && order.payment_history.length > 0
        ? order.payment_history[order.payment_history.length - 1]
        : null;
    setEditPaymentMethod(lastPayment?.payment_method || "cash");

    setEditRemarks(order.remarks || "");
    const dateStr = order.order_date || new Date().toISOString().split("T")[0];
    setEditOrderDate(dateStr);

    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        setEditDateObject(
          new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])),
        );
      } else {
        setEditDateObject(new Date());
      }
    } catch {
      setEditDateObject(new Date());
    }

    setEditPaymentScreenshot(null);
    setEditFormErrors({});
    setEditApiError(null);
    setShowEditDatePicker(false);
    setIsEditingDetail(true);
    setDetailModalVisible(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setIsEditingDetail(false);
    setShowEditDatePicker(false);
    setEditPaymentScreenshot(null);
    setEditFormErrors({});
    setEditApiError(null);
  };

  const handleCancelEdit = () => {
    setIsEditingDetail(false);
    setShowEditDatePicker(false);
    setEditPaymentScreenshot(null);
    setEditFormErrors({});
    setEditApiError(null);
  };

  // Live remaining calculation for edit form
  const editCalculatedRemaining = useMemo(() => {
    const tot = parseFloat(editTotalAmount) || 0;
    const paid = parseFloat(editPaidAmount) || 0;
    return Math.max(0, tot - paid);
  }, [editTotalAmount, editPaidAmount]);

  const handleEditPickImage = async () => {
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
        setEditPaymentScreenshot({
          uri: asset.uri,
          name: asset.fileName || asset.uri.split("/").pop() || "receipt.jpg",
          type: asset.mimeType || "image/jpeg",
        });
        setEditFormErrors((prev) => {
          const n = { ...prev };
          delete n.payment_screenshot;
          return n;
        });
      }
    } catch {
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

  const handleEditTakePhoto = async () => {
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
        setEditPaymentScreenshot({
          uri: asset.uri,
          name: asset.fileName || asset.uri.split("/").pop() || "receipt.jpg",
          type: asset.mimeType || "image/jpeg",
        });
        setEditFormErrors((prev) => {
          const n = { ...prev };
          delete n.payment_screenshot;
          return n;
        });
      }
    } catch {
      Alert.alert("Error", "Could not take photo. Please try again.");
    }
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};

    if (!editTotalAmount || parseFloat(editTotalAmount) <= 0) {
      errors.total_amount = "Valid total amount is required";
    }

    const tot = parseFloat(editTotalAmount) || 0;
    const paid = parseFloat(editPaidAmount) || 0;

    if (paid < 0) {
      errors.paid_amount = "Paid amount cannot be negative";
    }

    if (paid > tot) {
      errors.paid_amount = "Paid amount cannot exceed total amount";
    }

    if (editPaymentMethod !== "cash" && paid > 0 && !editPaymentScreenshot) {
      const hasExistingScreenshot = selectedOrder?.payment_history?.some((p) =>
        Boolean(p.payment_screenshot),
      );
      if (!hasExistingScreenshot) {
        errors.payment_screenshot = `A screenshot is required for ${
          PAYMENT_METHODS.find((p) => p.key === editPaymentMethod)?.label ||
          editPaymentMethod
        } payments`;
      }
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEditOrder = async () => {
    if (!selectedOrder) return;
    if (!validateEditForm()) return;
    setEditApiError(null);

    const payload: UpdateOfflineOrderPayload = {
      total_amount: editTotalAmount.trim(),
      paid_amount: editPaidAmount.trim() || "0.00",
      payment_method: editPaymentMethod,
      order_date: editOrderDate,
      remarks: editRemarks.trim(),
      ...(editPaymentScreenshot
        ? { payment_screenshot: editPaymentScreenshot }
        : {}),
    };

    try {
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
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update order.";
      setEditApiError(msg);
    }
  };

  const getOrderStatusBadge = (status: OfflineOrderStatus) => {
    switch (status) {
      case "Delivered":
        return {
          bg: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-700",
        };
      case "Confirmed":
        return {
          bg: "bg-blue-50 border-blue-200",
          text: "text-blue-700",
        };
      case "Cancelled":
        return {
          bg: "bg-red-50 border-red-200",
          text: "text-red-700",
        };
      default:
        return {
          bg: "bg-amber-50 border-amber-200",
          text: "text-amber-700",
        };
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return {
          bg: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-700",
        };
      case "Partial":
        return {
          bg: "bg-amber-50 border-amber-200",
          text: "text-amber-700",
        };
      default:
        return {
          bg: "bg-red-50 border-red-200",
          text: "text-red-700",
        };
    }
  };

  const selectedCustomerObj = customers.find(
    (c) => Number(c.id) === selectedCustomerId,
  );

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
            <Text className="text-xs font-bold text-white">New Order</Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <View className="mt-3 flex-row items-center rounded-xl border border-border bg-surface px-3.5 py-2">
          <Search size={16} color="#79726b" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by code, customer, or phone..."
            placeholderTextColor="#79726b"
            className="ml-2.5 flex-1 text-sm text-ink"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <X size={15} color="#79726b" />
            </Pressable>
          )}
        </View>

        {/* Status Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-1"
          contentContainerClassName="px-1 gap-2"
        >
          {STATUS_FILTERS.map((status) => {
            const isSelected = selectedStatus === status;
            return (
              <Pressable
                key={status}
                onPress={() => setSelectedStatus(status)}
                className={`rounded-full px-3.5 py-1.5 border ${
                  isSelected
                    ? "bg-ink border-ink"
                    : "bg-surface border-border active:opacity-80"
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
        </ScrollView>
      </View>

      {/* Main Order List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#e8452c" />
          <Text className="mt-2 text-xs text-ink-soft">Loading orders...</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={36} color="#e8452c" />
          <Text className="mt-3 text-center text-sm font-semibold text-ink">
            {error instanceof Error ? error.message : "Failed to load orders"}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 rounded-xl border border-border bg-surface px-5 py-2.5 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-ink">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id || item.order_code)}
          contentContainerClassName="p-5 pb-12"
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
          ListEmptyComponent={
            <View className="mt-12 items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                <Package size={22} color="#e8452c" />
              </View>
              <Text className="font-semibold text-ink">
                {searchQuery.trim() || selectedStatus !== "All"
                  ? "No matching orders found"
                  : "No orders yet"}
              </Text>
              <Text className="mt-1 text-center text-xs text-ink-soft">
                {searchQuery.trim() || selectedStatus !== "All"
                  ? "Try adjusting your search or status filter"
                  : "Create an offline order to start managing store deliveries and payments."}
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
          ItemSeparatorComponent={() => <View className="h-3.5" />}
          renderItem={({ item }) => {
            const orderBadge = getOrderStatusBadge(item.order_status);
            const payBadge = getPaymentStatusBadge(item.payment_status);

            return (
              <Pressable
                onPress={() => {
                  setSelectedOrder(item);
                  setIsEditingDetail(false);
                  setDetailModalVisible(true);
                }}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm active:opacity-90"
              >
                {/* Header: Code, Edit Button & Status */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                      <Package size={14} color="#e8452c" />
                    </View>
                    <Text className="text-sm font-bold text-ink">
                      {item.order_code}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(item);
                      }}
                      className="h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface-soft active:bg-brand/10"
                      hitSlop={8}
                    >
                      <Edit2 size={12} color="#79726b" />
                    </Pressable>
                    <View
                      className={`rounded-full border px-2.5 py-0.5 ${orderBadge.bg}`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${orderBadge.text}`}
                      >
                        {item.order_status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Customer Row */}
                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-semibold text-ink"
                    >
                      {item.customer_name || `Customer #${item.customer}`}
                    </Text>
                    {Boolean(item.customer_phone) && (
                      <Text className="text-xs text-ink-soft">
                        {item.customer_phone}
                      </Text>
                    )}
                  </View>
                  <View
                    className={`rounded-md border px-2 py-0.5 ${payBadge.bg}`}
                  >
                    <Text className={`text-[10px] font-bold ${payBadge.text}`}>
                      {item.payment_status}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View className="my-3 h-px bg-border/60" />

                {/* Amounts Breakdown */}
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[10px] uppercase font-semibold text-ink-soft">
                      Total
                    </Text>
                    <Text className="text-xs font-bold text-ink">
                      Rs. {Number(item.total_amount).toLocaleString()}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[10px] uppercase font-semibold text-ink-soft">
                      Paid
                    </Text>
                    <Text className="text-xs font-bold text-emerald-600">
                      Rs. {Number(item.paid_amount || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-[10px] uppercase font-semibold text-ink-soft">
                      Balance
                    </Text>
                    <Text className="text-xs font-bold text-amber-600">
                      Rs. {Number(item.remaining_amount || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[10px] uppercase font-semibold text-ink-soft">
                      Date
                    </Text>
                    <Text className="text-xs text-ink-soft">
                      {item.order_date || item.created_at?.slice(0, 10)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Order Detail & Edit Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseDetailModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/50"
        >
          <Pressable className="flex-1" onPress={handleCloseDetailModal} />
          <View className="max-h-[90%] rounded-t-3xl border-t border-border bg-background pb-8 pt-5 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between border-b border-border px-6 pb-4">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-bold text-ink">
                    {isEditingDetail ? "Edit Order" : selectedOrder?.order_code}
                  </Text>
                  {isEditingDetail && (
                    <View className="rounded-md bg-brand/10 px-2 py-0.5">
                      <Text className="text-[10px] font-bold uppercase text-brand">
                        Editing
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="mt-0.5 text-xs text-ink-soft">
                  {isEditingDetail
                    ? `${selectedOrder?.order_code} • ${selectedOrder?.customer_name}`
                    : `Placed on ${selectedOrder?.order_date}`}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                {!isEditingDetail && selectedOrder && (
                  <Pressable
                    onPress={() => handleOpenEditModal(selectedOrder)}
                    className="flex-row items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 active:opacity-75"
                    hitSlop={8}
                  >
                    <Edit2 size={13} color="#e8452c" />
                    <Text className="text-xs font-bold text-brand">Edit</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleCloseDetailModal}
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
              {selectedOrder &&
                (isEditingDetail ? (
                  /* ================= EDIT MODE ================= */
                  <>
                    {editApiError && (
                      <View className="mb-4 flex-row items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5">
                        <AlertCircle size={18} color="#e8452c" />
                        <Text className="flex-1 text-xs font-medium text-brand">
                          {editApiError}
                        </Text>
                      </View>
                    )}

                    {/* 1. Order Date */}
                    <View className="mb-4">
                      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                        Order Date
                      </Text>
                      <Pressable
                        onPress={() => setShowEditDatePicker(true)}
                        className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-surface px-4 active:bg-surface-soft"
                      >
                        <View className="flex-row items-center gap-2.5">
                          <Calendar size={16} color="#e8452c" />
                          <Text className="text-sm font-medium text-ink">
                            {editOrderDate}
                          </Text>
                        </View>
                        <Text className="text-xs font-semibold text-brand">
                          Change
                        </Text>
                      </Pressable>

                      {showEditDatePicker && (
                        <View className="mt-2 rounded-xl border border-border bg-surface p-2">
                          <DateTimePicker
                            value={editDateObject}
                            mode="date"
                            display={
                              Platform.OS === "ios" ? "inline" : "default"
                            }
                            onChange={(
                              event: DateTimePickerEvent,
                              selectedDate?: Date,
                            ) => {
                              if (Platform.OS !== "ios") {
                                setShowEditDatePicker(false);
                              }
                              if (selectedDate) {
                                setEditDateObject(selectedDate);
                                const year = selectedDate.getFullYear();
                                const month = String(
                                  selectedDate.getMonth() + 1,
                                ).padStart(2, "0");
                                const day = String(
                                  selectedDate.getDate(),
                                ).padStart(2, "0");
                                setEditOrderDate(`${year}-${month}-${day}`);
                              }
                            }}
                          />
                          {Platform.OS === "ios" && (
                            <Pressable
                              onPress={() => setShowEditDatePicker(false)}
                              className="mt-2 h-9 items-center justify-center rounded-lg bg-brand"
                            >
                              <Text className="text-xs font-bold text-white">
                                Done
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>

                    {/* 2. Total Amount */}
                    <View className="mb-4">
                      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                        Total Order Amount (Rs.) *
                      </Text>
                      <View
                        className={`flex-row items-center rounded-xl border bg-surface px-4 ${
                          editFormErrors.total_amount
                            ? "border-red-500"
                            : "border-border"
                        }`}
                      >
                        <Text className="mr-1 text-sm font-bold text-ink-soft">
                          Rs.
                        </Text>
                        <TextInput
                          value={editTotalAmount}
                          onChangeText={(val) => {
                            setEditTotalAmount(val);
                            if (editFormErrors.total_amount) {
                              setEditFormErrors((prev) => {
                                const n = { ...prev };
                                delete n.total_amount;
                                return n;
                              });
                            }
                          }}
                          placeholder="0.00"
                          placeholderTextColor="#79726b"
                          keyboardType="numeric"
                          className="h-12 flex-1 text-sm font-bold text-ink"
                        />
                      </View>
                      {editFormErrors.total_amount && (
                        <Text className="mt-1 text-xs font-medium text-red-500">
                          {editFormErrors.total_amount}
                        </Text>
                      )}
                    </View>

                    {/* 3. Paid Amount & Payment Method */}
                    <View className="mb-4">
                      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                        Paid Amount (Rs.)
                      </Text>
                      <View
                        className={`flex-row items-center rounded-xl border bg-surface px-4 ${
                          editFormErrors.paid_amount
                            ? "border-red-500"
                            : "border-border"
                        }`}
                      >
                        <Text className="mr-1 text-sm font-bold text-ink-soft">
                          Rs.
                        </Text>
                        <TextInput
                          value={editPaidAmount}
                          onChangeText={(val) => {
                            setEditPaidAmount(val);
                            if (editFormErrors.paid_amount) {
                              setEditFormErrors((prev) => {
                                const n = { ...prev };
                                delete n.paid_amount;
                                return n;
                              });
                            }
                          }}
                          placeholder="0.00"
                          placeholderTextColor="#79726b"
                          keyboardType="numeric"
                          className="h-12 flex-1 text-sm font-bold text-ink"
                        />
                      </View>
                      {editFormErrors.paid_amount && (
                        <Text className="mt-1 text-xs font-medium text-red-500">
                          {editFormErrors.paid_amount}
                        </Text>
                      )}

                      {/* Remaining Balance Summary Pill */}
                      <View className="mt-2.5 flex-row items-center justify-between rounded-xl border border-border bg-surface p-3">
                        <Text className="text-xs font-medium text-ink-soft">
                          Updated Remaining Balance:
                        </Text>
                        <Text
                          className={`text-sm font-bold ${
                            editCalculatedRemaining > 0
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          Rs. {editCalculatedRemaining.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* 4. Payment Method */}
                    <View className="mb-4">
                      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                        Payment Method
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {PAYMENT_METHODS.map((pm) => {
                          const isSelected = editPaymentMethod === pm.key;
                          return (
                            <Pressable
                              key={pm.key}
                              onPress={() => setEditPaymentMethod(pm.key)}
                              className={`rounded-xl border px-3.5 py-2.5 active:opacity-80 ${
                                isSelected
                                  ? "border-brand bg-brand/10"
                                  : "border-border bg-surface"
                              }`}
                            >
                              <Text
                                className={`text-xs font-semibold ${
                                  isSelected ? "text-brand" : "text-ink-soft"
                                }`}
                              >
                                {pm.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* 5. Payment Screenshot (if non-cash & paid > 0) */}
                    {editPaymentMethod !== "cash" &&
                      parseFloat(editPaidAmount) > 0 && (
                        <View className="mb-4">
                          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                            Payment Receipt / Screenshot *
                          </Text>
                          {editPaymentScreenshot ? (
                            <View className="overflow-hidden rounded-xl border border-border bg-surface">
                              <Image
                                source={{ uri: editPaymentScreenshot.uri }}
                                className="h-44 w-full"
                                contentFit="contain"
                              />
                              <View className="flex-row items-center justify-between border-t border-border bg-surface p-2.5">
                                <Text
                                  numberOfLines={1}
                                  className="mr-2 flex-1 text-xs text-ink-soft"
                                >
                                  {editPaymentScreenshot.name}
                                </Text>
                                <Pressable
                                  onPress={() => setEditPaymentScreenshot(null)}
                                  className="rounded-lg bg-red-50 px-2.5 py-1"
                                >
                                  <Text className="text-xs font-semibold text-brand">
                                    Remove
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : (
                            <View>
                              <View className="flex-row gap-3">
                                <Pressable
                                  onPress={handleEditPickImage}
                                  className="h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface active:bg-surface-soft"
                                >
                                  <ImageIcon size={20} color="#79726b" />
                                  <Text className="text-xs font-medium text-ink-soft">
                                    Upload Photo
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={handleEditTakePhoto}
                                  className="h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface active:bg-surface-soft"
                                >
                                  <Camera size={20} color="#79726b" />
                                  <Text className="text-xs font-medium text-ink-soft">
                                    Take Camera
                                  </Text>
                                </Pressable>
                              </View>
                              {selectedOrder?.payment_history?.some((p) =>
                                Boolean(p.payment_screenshot),
                              ) && (
                                <Text className="mt-1.5 text-[11px] font-medium text-emerald-600">
                                  ✓ A receipt screenshot was previously uploaded
                                  for this order. Attach a new one only if you
                                  want to replace it.
                                </Text>
                              )}
                            </View>
                          )}
                          {editFormErrors.payment_screenshot && (
                            <Text className="mt-1 text-xs font-medium text-red-500">
                              {editFormErrors.payment_screenshot}
                            </Text>
                          )}
                        </View>
                      )}

                    {/* 6. Remarks */}
                    <View className="mb-6">
                      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                        Remarks / Credit Terms
                      </Text>
                      <TextInput
                        value={editRemarks}
                        onChangeText={setEditRemarks}
                        placeholder="e.g. Credit terms, revised amount, delivery notes"
                        placeholderTextColor="#79726b"
                        multiline
                        numberOfLines={2}
                        className="min-h-[64px] rounded-xl border border-border bg-surface p-3 text-sm text-ink"
                      />
                    </View>

                    {/* Form Action Buttons */}
                    <View className="flex-row items-center gap-3 pb-6">
                      <Pressable
                        onPress={handleCancelEdit}
                        disabled={updateMutation.isPending}
                        className="h-12 flex-1 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
                      >
                        <Text className="text-sm font-semibold text-ink">
                          Cancel
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={handleSubmitEditOrder}
                        disabled={updateMutation.isPending}
                        className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80"
                      >
                        {updateMutation.isPending ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text className="text-sm font-bold text-white">
                            Save Changes
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                ) : (
                  /* ================= DETAIL MODE ================= */
                  <>
                    {/* Status Banner */}
                    <View className="mb-4 flex-row items-center justify-between rounded-xl border border-border bg-surface p-3.5">
                      <View>
                        <Text className="text-[10px] font-bold uppercase text-ink-soft">
                          Order Status
                        </Text>
                        <View className="mt-1 flex-row">
                          <View
                            className={`rounded-full border px-2.5 py-0.5 ${
                              getOrderStatusBadge(selectedOrder.order_status).bg
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                getOrderStatusBadge(selectedOrder.order_status)
                                  .text
                              }`}
                            >
                              {selectedOrder.order_status}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-right text-[10px] font-bold uppercase text-ink-soft">
                          Payment Status
                        </Text>
                        <View className="mt-1 flex-row">
                          <View
                            className={`rounded-full border px-2.5 py-0.5 ${
                              getPaymentStatusBadge(
                                selectedOrder.payment_status,
                              ).bg
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                getPaymentStatusBadge(
                                  selectedOrder.payment_status,
                                ).text
                              }`}
                            >
                              {selectedOrder.payment_status}
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
                        {selectedOrder.customer_name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-ink-soft">
                        Contact: {selectedOrder.customer_contact_person || "—"}
                      </Text>
                      {Boolean(selectedOrder.customer_phone) && (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(
                              `tel:${selectedOrder.customer_phone}`,
                            )
                          }
                          className="mt-2 flex-row items-center gap-1.5"
                        >
                          <Phone size={12} color="#e8452c" />
                          <Text className="text-xs font-semibold text-brand">
                            {selectedOrder.customer_phone}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Franchise & Sales Representative */}
                    {(Boolean(selectedOrder.franchise_name) ||
                      Boolean(selectedOrder.sales_person_name)) && (
                      <View className="mb-4 flex-row items-center justify-between rounded-xl border border-border bg-surface p-3.5">
                        {Boolean(selectedOrder.franchise_name) && (
                          <View className="mr-2 flex-1">
                            <Text className="text-[10px] font-bold uppercase text-ink-soft">
                              Franchise
                            </Text>
                            <Text
                              className="mt-0.5 text-xs font-semibold text-ink"
                              numberOfLines={1}
                            >
                              {selectedOrder.franchise_name}
                            </Text>
                          </View>
                        )}
                        {Boolean(selectedOrder.sales_person_name) && (
                          <View className="items-end">
                            <Text className="text-right text-[10px] font-bold uppercase text-ink-soft">
                              Sales Representative
                            </Text>
                            <Text
                              className="mt-0.5 text-right text-xs font-semibold text-ink"
                              numberOfLines={1}
                            >
                              {selectedOrder.sales_person_name}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Items List */}
                    <View className="mb-4 rounded-xl border border-border bg-surface p-3.5">
                      <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                        Items Ordered ({selectedOrder.items?.length || 0})
                      </Text>
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((it, idx) => (
                          <View
                            key={it.id || idx}
                            className="flex-row items-center justify-between border-b border-border/40 py-2 last:border-b-0"
                          >
                            <View className="flex-1 pr-2">
                              <Text className="text-xs font-semibold text-ink">
                                {it.product_name ||
                                  `Inventory #${it.inventory}`}
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
                        <Text className="text-xs text-ink-soft">
                          Total Amount:
                        </Text>
                        <Text className="text-xs font-bold text-ink">
                          Rs.{" "}
                          {Number(selectedOrder.total_amount).toLocaleString()}
                        </Text>
                      </View>
                      <View className="flex-row justify-between py-1">
                        <Text className="text-xs text-ink-soft">
                          Paid Amount:
                        </Text>
                        <Text className="text-xs font-bold text-emerald-600">
                          Rs.{" "}
                          {Number(
                            selectedOrder.paid_amount || 0,
                          ).toLocaleString()}
                        </Text>
                      </View>
                      <View className="mt-1 flex-row justify-between border-t border-border pt-1.5 py-1">
                        <Text className="text-xs font-bold text-ink">
                          Remaining Balance:
                        </Text>
                        <Text className="text-xs font-bold text-amber-600">
                          Rs.{" "}
                          {Number(
                            selectedOrder.remaining_amount || 0,
                          ).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Payment History Records */}
                    {selectedOrder.payment_history &&
                      selectedOrder.payment_history.length > 0 && (
                        <View className="mb-4 rounded-xl border border-border bg-surface p-3.5">
                          <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                            Payment History (
                            {selectedOrder.payment_history.length})
                          </Text>
                          {selectedOrder.payment_history.map((ph, idx) => (
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
                                      {ph.payment_method_display ||
                                        ph.payment_method}
                                    </Text>
                                  </View>
                                </View>
                                <Text className="text-[11px] text-ink-soft">
                                  {ph.payment_date}
                                </Text>
                              </View>
                              {Boolean(ph.remarks) && (
                                <Text className="mt-1 text-xs text-ink-soft">
                                  {ph.remarks}
                                </Text>
                              )}
                              {Boolean(ph.payment_screenshot) && (
                                <View className="mt-2 overflow-hidden rounded-lg border border-border bg-surface-soft">
                                  <Image
                                    source={{
                                      uri: ph.payment_screenshot || undefined,
                                    }}
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
                    {Boolean(selectedOrder.remarks) && (
                      <View className="mb-4 rounded-xl border border-border bg-surface p-3.5">
                        <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                          Remarks / Notes
                        </Text>
                        <Text className="text-xs leading-4 text-ink">
                          {selectedOrder.remarks}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons: Edit and Cancel */}
                    <View className="mb-6 flex-row items-center gap-3">
                      <Pressable
                        onPress={() => handleOpenEditModal(selectedOrder)}
                        className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80"
                      >
                        <Edit2 size={16} color="#ffffff" />
                        <Text className="text-sm font-bold text-white">
                          Edit Order
                        </Text>
                      </Pressable>

                      {selectedOrder.order_status !== "Cancelled" && (
                        <Pressable
                          onPress={() => handleCancelOrder(selectedOrder)}
                          disabled={cancelMutation.isPending}
                          className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 active:opacity-70"
                        >
                          {cancelMutation.isPending ? (
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
                ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Order Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseCreateModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/50"
        >
          <Pressable className="flex-1" onPress={handleCloseCreateModal} />
          <View className="max-h-[92%] rounded-t-3xl border-t border-border bg-background pb-8 pt-5 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 pb-4 border-b border-border">
              <View>
                <Text className="text-lg font-bold text-ink">
                  New Offline Order
                </Text>
                <Text className="text-xs text-ink-soft">
                  Create delivery order with stock deduction
                </Text>
              </View>
              <Pressable
                onPress={handleCloseCreateModal}
                className="h-8 w-8 items-center justify-center rounded-full bg-surface"
                hitSlop={8}
              >
                <X size={16} color="#79726b" />
              </Pressable>
            </View>

            <ScrollView
              className="px-6 pt-4"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* API Error Banner */}
              {apiError && (
                <View className="mb-4 flex-row items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                  <AlertCircle size={15} color="#e8452c" />
                  <Text className="flex-1 text-xs text-red-600">
                    {apiError}
                  </Text>
                </View>
              )}

              {/* 1. Customer Selection */}
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Select Customer *
                </Text>
                <Pressable
                  onPress={() => setCustomerPickerOpen((v) => !v)}
                  className={`h-11 flex-row items-center justify-between rounded-xl border bg-surface px-3.5 ${
                    formErrors.customer ? "border-red-500" : "border-border"
                  }`}
                >
                  <View className="flex-row items-center gap-2">
                    <Store size={15} color="#79726b" />
                    <Text
                      numberOfLines={1}
                      className={`text-sm ${
                        selectedCustomerObj
                          ? "font-semibold text-ink"
                          : "text-ink-soft"
                      }`}
                    >
                      {selectedCustomerObj
                        ? `${selectedCustomerObj.store_name} (${selectedCustomerObj.contact_person})`
                        : "Choose customer"}
                    </Text>
                  </View>
                  <ChevronDown size={16} color="#79726b" />
                </Pressable>

                {/* Customer List Picker Dropdown */}
                {customerPickerOpen && (
                  <View className="mt-1.5 max-h-48 rounded-xl border border-border bg-background p-1 shadow-md">
                    <ScrollView nestedScrollEnabled>
                      {customers.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            setSelectedCustomerId(Number(c.id));
                            setCustomerPickerOpen(false);
                            if (formErrors.customer) {
                              setFormErrors((prev) => ({
                                ...prev,
                                customer: "",
                              }));
                            }
                          }}
                          className={`flex-row items-center justify-between rounded-lg p-2.5 ${
                            Number(c.id) === selectedCustomerId
                              ? "bg-brand/10"
                              : "active:bg-surface"
                          }`}
                        >
                          <View>
                            <Text className="text-xs font-bold text-ink">
                              {c.store_name}
                            </Text>
                            <Text className="text-[11px] text-ink-soft">
                              {c.contact_person} • {c.phone_number}
                            </Text>
                          </View>
                          {Number(c.id) === selectedCustomerId && (
                            <CheckCircle2 size={14} color="#e8452c" />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {Boolean(formErrors.customer) && (
                  <Text className="mt-1 text-xs text-red-500">
                    {formErrors.customer}
                  </Text>
                )}
              </View>

              {/* 2. Order Date */}
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Order Date *
                </Text>
                <Pressable
                  onPress={() => setShowDatePicker((prev) => !prev)}
                  className="h-11 flex-row items-center justify-between rounded-xl border border-border bg-surface px-3.5 active:opacity-80"
                >
                  <View className="flex-row items-center gap-2.5">
                    <Calendar size={16} color="#e8452c" />
                    <Text className="text-sm font-semibold text-ink">
                      {orderDate}
                    </Text>
                  </View>
                  <View className="rounded-lg bg-brand/10 px-2.5 py-1">
                    <Text className="text-xs font-semibold text-brand">
                      {showDatePicker ? "Close" : "Change Date"}
                    </Text>
                  </View>
                </Pressable>

                {/* Quick Date Presets */}
                <View className="mt-2 flex-row gap-2">
                  <Pressable
                    onPress={() => {
                      const today = new Date();
                      setDateObject(today);
                      const y = today.getFullYear();
                      const m = String(today.getMonth() + 1).padStart(2, "0");
                      const d = String(today.getDate()).padStart(2, "0");
                      setOrderDate(`${y}-${m}-${d}`);
                      setShowDatePicker(false);
                    }}
                    className="rounded-lg bg-surface border border-border px-2.5 py-1 active:opacity-70"
                  >
                    <Text className="text-[11px] font-semibold text-ink-soft">
                      Today
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setDateObject(yesterday);
                      const y = yesterday.getFullYear();
                      const m = String(yesterday.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const d = String(yesterday.getDate()).padStart(2, "0");
                      setOrderDate(`${y}-${m}-${d}`);
                      setShowDatePicker(false);
                    }}
                    className="rounded-lg bg-surface border border-border px-2.5 py-1 active:opacity-70"
                  >
                    <Text className="text-[11px] font-semibold text-ink-soft">
                      Yesterday
                    </Text>
                  </Pressable>
                </View>

                {/* Date Picker Component */}
                {showDatePicker &&
                  (Platform.OS === "ios" ? (
                    <View className="mt-2.5 rounded-2xl border border-border bg-background p-3 shadow-sm">
                      <View className="flex-row items-center justify-between pb-2 mb-1 border-b border-border">
                        <Text className="text-xs font-bold text-ink">
                          Select Order Date
                        </Text>
                        <Pressable
                          onPress={() => setShowDatePicker(false)}
                          className="rounded-lg bg-brand px-3 py-1"
                        >
                          <Text className="text-xs font-bold text-white">
                            Done
                          </Text>
                        </Pressable>
                      </View>
                      <DateTimePicker
                        value={dateObject}
                        mode="date"
                        display="inline"
                        themeVariant="light"
                        accentColor="#e8452c"
                        maximumDate={new Date()}
                        onChange={(
                          event: DateTimePickerEvent,
                          selectedDate?: Date,
                        ) => {
                          if (selectedDate) {
                            setDateObject(selectedDate);
                            const year = selectedDate.getFullYear();
                            const month = String(
                              selectedDate.getMonth() + 1,
                            ).padStart(2, "0");
                            const day = String(selectedDate.getDate()).padStart(
                              2,
                              "0",
                            );
                            setOrderDate(`${year}-${month}-${day}`);
                          }
                        }}
                      />
                    </View>
                  ) : (
                    <DateTimePicker
                      value={dateObject}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(
                        event: DateTimePickerEvent,
                        selectedDate?: Date,
                      ) => {
                        setShowDatePicker(false);
                        if (event.type === "set" && selectedDate) {
                          setDateObject(selectedDate);
                          const year = selectedDate.getFullYear();
                          const month = String(
                            selectedDate.getMonth() + 1,
                          ).padStart(2, "0");
                          const day = String(selectedDate.getDate()).padStart(
                            2,
                            "0",
                          );
                          setOrderDate(`${year}-${month}-${day}`);
                        }
                      }}
                    />
                  ))}
              </View>

              {/* 3. Items Section */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Order Items *
                  </Text>
                  <Pressable
                    onPress={handleAddItem}
                    className="flex-row items-center gap-1 rounded-lg bg-surface px-2.5 py-1 border border-border active:opacity-70"
                  >
                    <Plus size={12} color="#e8452c" />
                    <Text className="text-xs font-semibold text-brand">
                      Add Product
                    </Text>
                  </Pressable>
                </View>

                {items.map((it, idx) => (
                  <View
                    key={idx}
                    className="mb-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm"
                  >
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View className="flex-row items-center gap-1.5">
                        <View className="h-6 w-6 items-center justify-center rounded-md bg-brand/10">
                          <Package size={13} color="#e8452c" />
                        </View>
                        <Text className="text-xs font-bold text-ink">
                          Product #{idx + 1}
                        </Text>
                      </View>
                      {items.length > 1 && (
                        <Pressable
                          onPress={() => handleRemoveItem(idx)}
                          hitSlop={8}
                        >
                          <Trash2 size={13} color="#e8452c" />
                        </Pressable>
                      )}
                    </View>

                    {/* Product Selection Button */}
                    <Pressable
                      onPress={() => {
                        if (openProductDropdownIndex === idx) {
                          setOpenProductDropdownIndex(null);
                        } else {
                          setProductSearch("");
                          setOpenProductDropdownIndex(idx);
                        }
                      }}
                      className="rounded-xl border border-border bg-background p-3 active:opacity-80"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-2">
                          <Text
                            numberOfLines={1}
                            className={`text-sm ${
                              it.product
                                ? "font-bold text-ink"
                                : "font-medium text-ink-soft"
                            }`}
                          >
                            {it.product?.product_name ||
                              "Tap to select product..."}
                          </Text>

                          {it.product ? (
                            <View className="mt-1.5 flex-row items-center gap-2">
                              <View
                                className={`rounded px-1.5 py-0.5 ${
                                  it.product.quantity > 0
                                    ? "bg-emerald-50 border border-emerald-200"
                                    : "bg-red-50 border border-red-200"
                                }`}
                              >
                                <Text
                                  className={`text-[10px] font-semibold ${
                                    it.product.quantity > 0
                                      ? "text-emerald-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {it.product.quantity > 0
                                    ? `Stock: ${it.product.quantity}`
                                    : "Out of Stock"}
                                </Text>
                              </View>
                              <View className="rounded bg-border/40 px-1.5 py-0.5">
                                <Text className="text-[10px] font-bold text-ink-soft">
                                  Inv ID:{" "}
                                  {it.product.inventory_id ??
                                    it.product.product_id}
                                </Text>
                              </View>
                              {Boolean(
                                it.product.total_amount &&
                                it.product.total_amount > 0,
                              ) && (
                                <Text className="text-xs font-semibold text-brand">
                                  Rs.{" "}
                                  {Number(
                                    it.product.total_amount,
                                  ).toLocaleString()}
                                </Text>
                              )}
                            </View>
                          ) : (
                            <Text className="text-[11px] text-brand mt-0.5 font-medium">
                              Choose product from inventory
                            </Text>
                          )}
                        </View>
                        <ChevronDown
                          size={16}
                          color="#79726b"
                          style={{
                            transform: [
                              {
                                rotate:
                                  openProductDropdownIndex === idx
                                    ? "180deg"
                                    : "0deg",
                              },
                            ],
                          }}
                        />
                      </View>
                    </Pressable>

                    {/* Inline Product Dropdown List */}
                    {openProductDropdownIndex === idx && (
                      <View className="mt-2 rounded-xl border border-border bg-background p-2 shadow-md">
                        {/* Search Input */}
                        <View className="mb-2 flex-row items-center rounded-lg border border-border bg-surface px-2.5">
                          <Search size={13} color="#79726b" />
                          <TextInput
                            value={productSearch}
                            onChangeText={setProductSearch}
                            placeholder="Search inventory..."
                            placeholderTextColor="#79726b"
                            className="h-8 flex-1 pl-2 text-xs text-ink"
                            autoCapitalize="none"
                          />
                          {Boolean(productSearch) && (
                            <Pressable
                              onPress={() => setProductSearch("")}
                              hitSlop={6}
                            >
                              <X size={12} color="#79726b" />
                            </Pressable>
                          )}
                        </View>

                        {/* List */}
                        <ScrollView
                          style={{ maxHeight: 180 }}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                        >
                          {isLoadingProducts ? (
                            <View className="py-4 items-center justify-center">
                              <ActivityIndicator size="small" color="#e8452c" />
                              <Text className="mt-1 text-[11px] text-ink-soft">
                                Loading products...
                              </Text>
                            </View>
                          ) : filteredProducts.length === 0 ? (
                            <View className="py-4 items-center justify-center">
                              <Text className="text-xs text-ink-soft">
                                No products found
                              </Text>
                            </View>
                          ) : (
                            filteredProducts.map((prod) => {
                              const isSelected =
                                it.inventory_id ===
                                (prod.inventory_id ?? prod.product_id);

                              return (
                                <Pressable
                                  key={prod.inventory_id ?? prod.product_id}
                                  onPress={() => handleSelectProduct(idx, prod)}
                                  className={`mb-1.5 flex-row items-center justify-between rounded-lg p-2.5 ${
                                    isSelected
                                      ? "bg-brand/10 border border-brand/30"
                                      : "border border-border/40 bg-surface active:bg-surface/80"
                                  }`}
                                >
                                  <View className="flex-1 pr-2">
                                    <View className="flex-row items-center gap-1.5">
                                      <Text className="text-xs font-bold text-ink">
                                        {prod.product_name}
                                      </Text>
                                      <View className="rounded bg-border/50 px-1 py-0.2">
                                        <Text className="text-[9px] font-semibold text-ink-soft">
                                          ID:{" "}
                                          {prod.inventory_id ?? prod.product_id}
                                        </Text>
                                      </View>
                                    </View>

                                    <View className="mt-1 flex-row items-center gap-2">
                                      <View
                                        className={`rounded px-1.5 py-0.5 ${
                                          prod.quantity > 0
                                            ? "bg-emerald-50 border border-emerald-200"
                                            : "bg-red-50 border border-red-200"
                                        }`}
                                      >
                                        <Text
                                          className={`text-[10px] font-semibold ${
                                            prod.quantity > 0
                                              ? "text-emerald-700"
                                              : "text-red-700"
                                          }`}
                                        >
                                          {prod.quantity > 0
                                            ? `Stock: ${prod.quantity}`
                                            : "Out of Stock"}
                                        </Text>
                                      </View>

                                      {Boolean(
                                        prod.total_amount &&
                                        prod.total_amount > 0,
                                      ) && (
                                        <Text className="text-[11px] font-semibold text-brand">
                                          Rs.{" "}
                                          {Number(
                                            prod.total_amount,
                                          ).toLocaleString()}
                                        </Text>
                                      )}
                                    </View>
                                  </View>

                                  {isSelected && (
                                    <CheckCircle2 size={16} color="#e8452c" />
                                  )}
                                </Pressable>
                              );
                            })
                          )}
                        </ScrollView>
                      </View>
                    )}

                    {/* Quantity Stepper & Subtotal */}
                    <View className="mt-3 flex-row items-center justify-between pt-2 border-t border-border/50">
                      <View>
                        <Text className="text-[10px] uppercase font-semibold text-ink-soft">
                          Quantity
                        </Text>
                        {Boolean(
                          it.product?.total_amount &&
                          it.product.total_amount > 0,
                        ) && (
                          <Text className="text-xs font-bold text-ink mt-0.5">
                            Subtotal: Rs.{" "}
                            {(
                              Number(it.product!.total_amount) * it.quantity
                            ).toLocaleString()}
                          </Text>
                        )}
                      </View>

                      <View className="flex-row items-center gap-2">
                        {/* Minus */}
                        <Pressable
                          onPress={() => {
                            if (it.quantity > 1) {
                              handleUpdateItem(
                                idx,
                                "quantity",
                                it.quantity - 1,
                              );
                            }
                          }}
                          disabled={it.quantity <= 1}
                          className={`h-8 w-8 items-center justify-center rounded-lg border border-border ${
                            it.quantity <= 1
                              ? "bg-surface opacity-40"
                              : "bg-background active:opacity-70"
                          }`}
                        >
                          <Minus size={13} color="#241a12" />
                        </Pressable>

                        {/* Input */}
                        <TextInput
                          value={String(it.quantity || "")}
                          onChangeText={(val) => {
                            const num = parseInt(val, 10);
                            handleUpdateItem(
                              idx,
                              "quantity",
                              isNaN(num) ? 1 : Math.max(1, num),
                            );
                          }}
                          placeholder="1"
                          placeholderTextColor="#79726b"
                          keyboardType="numeric"
                          className="h-8 w-12 rounded-lg border border-border bg-background text-center text-xs font-bold text-ink"
                        />

                        {/* Plus */}
                        <Pressable
                          onPress={() => {
                            handleUpdateItem(idx, "quantity", it.quantity + 1);
                          }}
                          className="h-8 w-8 items-center justify-center rounded-lg border border-border bg-background active:opacity-70"
                        >
                          <Plus size={13} color="#241a12" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}

                {Boolean(formErrors.items) && (
                  <Text className="mt-1 text-xs text-red-500">
                    {formErrors.items}
                  </Text>
                )}
              </View>

              {/* 4. Total Amount & Paid Amount */}
              <View className="mb-4 flex-row gap-3">
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      Total (Rs.) *
                    </Text>
                    {calculatedTotal > 0 && (
                      <Pressable
                        onPress={() => setTotalAmount(String(calculatedTotal))}
                        hitSlop={6}
                      >
                        <Text className="text-[11px] font-bold text-brand">
                          Use Rs. {calculatedTotal.toLocaleString()}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <TextInput
                    value={totalAmount}
                    onChangeText={(val) => {
                      setTotalAmount(val);
                      if (formErrors.total_amount) {
                        setFormErrors((prev) => ({
                          ...prev,
                          total_amount: "",
                        }));
                      }
                    }}
                    placeholder="e.g. 15000.00"
                    placeholderTextColor="#79726b"
                    keyboardType="numeric"
                    className={`h-11 rounded-xl border bg-surface px-3 text-sm font-bold text-ink ${
                      formErrors.total_amount
                        ? "border-red-500"
                        : "border-border"
                    }`}
                  />
                  {Boolean(formErrors.total_amount) && (
                    <Text className="mt-1 text-xs text-red-500">
                      {formErrors.total_amount}
                    </Text>
                  )}
                </View>

                <View className="flex-1">
                  <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Paid Amount (Rs.)
                  </Text>
                  <TextInput
                    value={paidAmount}
                    onChangeText={(val) => {
                      setPaidAmount(val);
                      if (formErrors.paid_amount) {
                        setFormErrors((prev) => ({ ...prev, paid_amount: "" }));
                      }
                    }}
                    placeholder="0.00 (Credit)"
                    placeholderTextColor="#79726b"
                    keyboardType="numeric"
                    className={`h-11 rounded-xl border bg-surface px-3 text-sm font-bold text-ink ${
                      formErrors.paid_amount
                        ? "border-red-500"
                        : "border-border"
                    }`}
                  />
                  {Boolean(formErrors.paid_amount) && (
                    <Text className="mt-1 text-xs text-red-500">
                      {formErrors.paid_amount}
                    </Text>
                  )}
                </View>
              </View>

              {/* Remaining balance preview */}
              <View className="mb-4 rounded-xl bg-surface p-3 flex-row items-center justify-between border border-border">
                <Text className="text-xs text-ink-soft">
                  Remaining Balance (Credit):
                </Text>
                <Text className="text-sm font-bold text-amber-600">
                  Rs. {calculatedRemaining.toLocaleString()}
                </Text>
              </View>

              {/* 5. Payment Method */}
              <View className="mb-4">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Payment Method
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = paymentMethod === pm.key;
                    return (
                      <Pressable
                        key={pm.key}
                        onPress={() => setPaymentMethod(pm.key)}
                        className={`rounded-xl px-3.5 py-2 border ${
                          isSelected
                            ? "bg-brand/10 border-brand"
                            : "bg-surface border-border active:opacity-80"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected ? "text-brand" : "text-ink"
                          }`}
                        >
                          {pm.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* 5b. Payment Screenshot (Required for non-cash with paid amount) */}
              {paymentMethod !== "cash" && (
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      Payment Screenshot
                    </Text>
                    <View
                      className={`rounded px-2 py-0.5 ${
                        parseFloat(paidAmount) > 0
                          ? "bg-brand/10"
                          : "bg-surface border border-border"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          parseFloat(paidAmount) > 0
                            ? "text-brand"
                            : "text-ink-soft"
                        }`}
                      >
                        {parseFloat(paidAmount) > 0 ? "Required" : "Optional"}
                      </Text>
                    </View>
                  </View>

                  {paymentScreenshot ? (
                    /* Attached preview */
                    <View className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3">
                      <View className="flex-row items-center gap-3">
                        <Image
                          source={{ uri: paymentScreenshot.uri }}
                          style={{ width: 72, height: 72, borderRadius: 10 }}
                          contentFit="cover"
                        />
                        <View className="flex-1">
                          <View className="flex-row items-center gap-1.5 mb-0.5">
                            <CheckCircle2 size={14} color="#16a34a" />
                            <Text className="text-xs font-bold text-emerald-700">
                              Screenshot Attached
                            </Text>
                          </View>
                          <Text
                            className="text-[11px] text-ink-soft mb-2.5"
                            numberOfLines={1}
                          >
                            {paymentScreenshot.name}
                          </Text>
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={handlePickImage}
                              className="flex-row items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 active:opacity-70"
                            >
                              <RefreshCw size={11} color="#79726b" />
                              <Text className="text-[11px] font-semibold text-ink">
                                Change
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setPaymentScreenshot(null);
                                setFormErrors((prev) => {
                                  const n = { ...prev };
                                  delete n.payment_screenshot;
                                  return n;
                                });
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
                    /* Upload area */
                    <View
                      className={`rounded-2xl border-2 border-dashed p-5 items-center justify-center ${
                        formErrors.payment_screenshot
                          ? "border-red-400 bg-red-50/40"
                          : "border-border bg-surface/60"
                      }`}
                    >
                      <View className="mb-2.5 h-11 w-11 items-center justify-center rounded-full bg-brand/10">
                        <UploadCloud size={20} color="#e8452c" />
                      </View>
                      <Text className="text-xs font-bold text-ink text-center">
                        Attach Transfer Receipt or Screenshot
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-ink-soft text-center mb-3.5">
                        Upload proof for verification and accounting
                      </Text>
                      <View className="flex-row gap-2.5">
                        <Pressable
                          onPress={handlePickImage}
                          className="flex-row items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 shadow-sm active:opacity-75"
                        >
                          <ImageIcon size={14} color="#241a12" />
                          <Text className="text-xs font-semibold text-ink">
                            Gallery
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleTakePhoto}
                          className="flex-row items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 shadow-sm active:opacity-75"
                        >
                          <Camera size={14} color="#241a12" />
                          <Text className="text-xs font-semibold text-ink">
                            Camera
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {Boolean(formErrors.payment_screenshot) && (
                    <Text className="mt-1 text-xs text-red-500">
                      {formErrors.payment_screenshot}
                    </Text>
                  )}
                </View>
              )}

              {/* 6. Remarks */}
              <View className="mb-6">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Remarks / Credit Terms
                </Text>
                <TextInput
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="e.g. Delivered to shop, credit due in 30 days"
                  placeholderTextColor="#79726b"
                  multiline
                  numberOfLines={2}
                  className="min-h-[64px] rounded-xl border border-border bg-surface p-3 text-sm text-ink"
                />
              </View>

              {/* Form Action Buttons */}
              <View className="flex-row items-center gap-3 pb-6">
                <Pressable
                  onPress={handleCloseCreateModal}
                  disabled={createMutation.isPending}
                  className="flex-1 h-12 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
                >
                  <Text className="text-sm font-semibold text-ink">Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleSubmitOrder}
                  disabled={createMutation.isPending}
                  className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80"
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">
                      Place Order
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
