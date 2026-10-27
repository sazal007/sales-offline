// src/components/orders/CreateOrderModal.tsx

import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  X,
  Store,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Package,
  Plus,
  Trash2,
  Minus,
  Search,
  DollarSign,
  ImageIcon,
  Camera,
  RefreshCw,
  AlertCircle,
} from "lucide-react-native";
import type { OfflineCustomer } from "@/types/customer";
import type {
  CreateOfflineOrderPayload,
  OfflineOrderDetailResponse,
  OfflinePaymentMethod,
  Product,
} from "@/types/offlineSales";
import { useCreateOfflineOrderMutation } from "@/hooks/useOfflineOrderQueries";
import { useCustomersQuery } from "@/hooks/useCustomerQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { PAYMENT_METHODS, type SelectedOrderItem } from "./orderHelpers";

interface CreateOrderModalProps {
  visible: boolean;
  onClose: () => void;
  customers: OfflineCustomer[];
  products: Product[];
  onSuccess?: (order: OfflineOrderDetailResponse) => void;
}

export function CreateOrderModal({
  visible,
  onClose,
  customers,
  products,
  onSuccess,
}: CreateOrderModalProps) {
  const createMutation = useCreateOfflineOrderMutation();

  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);

  const {
    data: fetchedCustomers = [],
    isLoading: isSearchingCustomers,
  } = useCustomersQuery(debouncedCustomerSearch);

  const displayedCustomers = debouncedCustomerSearch.trim()
    ? fetchedCustomers
    : fetchedCustomers.length > 0
      ? fetchedCustomers
      : customers;

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
  const [isPrePaid, setIsPrePaid] = useState<boolean>(false);
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

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [openProductDropdownIndex, setOpenProductDropdownIndex] = useState<
    number | null
  >(null);
  const [productSearch, setProductSearch] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
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
      setIsPrePaid(false);
      setPaymentMethod("cash");
      setRemarks("");
      setPaymentScreenshot(null);
      setFormErrors({});
      setApiError(null);
      setCustomerPickerOpen(false);
      setCustomerSearch("");
      setOpenProductDropdownIndex(null);
      setProductSearch("");
    }
  }, [visible, customers, products]);

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

  const calculatedTotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const price = it.product?.total_amount || 0;
      return acc + price * it.quantity;
    }, 0);
  }, [items]);

  const calculatedRemaining = useMemo(() => {
    const tot = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    return Math.max(0, tot - paid);
  }, [totalAmount, paidAmount]);

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

      const newTotal = updated.reduce((acc, it) => {
        const price = it.product?.total_amount || 0;
        return acc + price * it.quantity;
      }, 0);
      if (newTotal > 0 && (!totalAmount || totalAmount === "0")) {
        setTotalAmount(String(newTotal));
        if (isPrePaid) {
          setPaidAmount(String(newTotal));
        }
      }

      return updated;
    });
    setOpenProductDropdownIndex(null);
    setProductSearch("");
  };

  const handleTotalAmountChange = (val: string) => {
    setTotalAmount(val);
    if (isPrePaid) {
      setPaidAmount(val);
    }
    if (formErrors.total_amount) {
      setFormErrors((prev) => ({
        ...prev,
        total_amount: "",
      }));
    }
  };

  const handleTogglePrePaid = (val: boolean) => {
    setIsPrePaid(val);
    if (val) {
      setPaidAmount(totalAmount || "");
    } else {
      setPaidAmount("0");
      setPaymentScreenshot(null);
      setPaymentMethod("cash");
    }
    setFormErrors((prev) => {
      const n = { ...prev };
      delete n.paid_amount;
      delete n.payment_screenshot;
      return n;
    });
  };

  const handlePaidAmountChange = (val: string) => {
    setPaidAmount(val);
    if (formErrors.paid_amount) {
      setFormErrors((prev) => ({
        ...prev,
        paid_amount: "",
      }));
    }
  };

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

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!selectedCustomerId) {
      errors.customer = "Please select a customer";
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      errors.total_amount = "Valid total amount is required";
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

    if (isPrePaid) {
      const tot = parseFloat(totalAmount) || 0;
      const paid = parseFloat(paidAmount) || 0;

      if (paid < 0) {
        errors.paid_amount = "Paid amount cannot be negative";
      } else if (paid > tot) {
        errors.paid_amount = "Paid amount cannot exceed total amount";
      }

      if (paymentMethod !== "cash" && !paymentScreenshot) {
        const methodName =
          PAYMENT_METHODS.find((p) => p.key === paymentMethod)?.label ||
          paymentMethod;
        errors.payment_screenshot = `Payment screenshot is compulsory for ${methodName} payments`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setApiError(null);

    const payload: CreateOfflineOrderPayload = {
      customer: Number(selectedCustomerId),
      order_date: orderDate,
      total_amount: totalAmount.trim(),
      paid_amount: isPrePaid ? (paidAmount.trim() || "0.00") : "0.00",
      payment_method: isPrePaid ? paymentMethod : "cash",
      remarks: remarks.trim() || undefined,
      items: items.map((it) => ({
        inventory_id: Number(it.inventory_id),
        quantity: Number(it.quantity),
      })),
      ...(isPrePaid && paymentScreenshot ? { payment_screenshot: paymentScreenshot } : {}),
    };

    try {
      const created = await createMutation.mutateAsync(payload);
      onSuccess?.(created);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to place order.";
      setApiError(msg);
    }
  };

  // Look in displayed customers first, then fall back to passed-in customers
  const selectedCustomerObj =
    displayedCustomers.find((c) => Number(c.id) === selectedCustomerId) ??
    customers.find((c) => Number(c.id) === selectedCustomerId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/50"
      >
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[92%] rounded-t-3xl border-t border-border bg-background pb-8 pt-5 shadow-2xl">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between border-b border-border px-6 pb-4">
            <View>
              <Text className="text-lg font-bold text-ink">
                New Offline Order
              </Text>
              <Text className="text-xs text-ink-soft">
                Create delivery order with stock deduction
              </Text>
            </View>
            <Pressable
              onPress={onClose}
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
                <Text className="flex-1 text-xs text-red-600">{apiError}</Text>
              </View>
            )}

            {/* 1. Customer Selection */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Select Customer *
              </Text>

              <Pressable
                onPress={() => setCustomerPickerOpen((prev) => !prev)}
                className={`h-12 flex-row items-center justify-between rounded-xl border bg-surface px-4 ${
                  formErrors.customer ? "border-red-500" : "border-border"
                }`}
              >
                <View className="flex-1 flex-row items-center gap-2.5 pr-2">
                  <Store size={16} color="#79726b" />
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
                      : "Tap to choose a customer..."}
                  </Text>
                </View>
                <ChevronDown
                  size={16}
                  color="#79726b"
                  style={{
                    transform: [{ rotate: customerPickerOpen ? "180deg" : "0deg" }],
                  }}
                />
              </Pressable>

              {customerPickerOpen && (
                <View className="mt-1.5 rounded-xl border border-border bg-surface shadow-md overflow-hidden">
                  {/* Search input */}
                  <View className="flex-row items-center gap-2 border-b border-border px-3 py-2">
                    <Search size={14} color="#79726b" />
                    <TextInput
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                      placeholder="Search by name, phone..."
                      placeholderTextColor="#79726b"
                      autoFocus
                      returnKeyType="search"
                      className="flex-1 text-xs text-ink py-0"
                    />
                    {customerSearch.length > 0 && (
                      <Pressable
                        onPress={() => setCustomerSearch("")}
                        hitSlop={8}
                      >
                        <X size={13} color="#79726b" />
                      </Pressable>
                    )}
                  </View>

                  {/* Results */}
                  <ScrollView
                    nestedScrollEnabled
                    className="p-1"
                    style={{ maxHeight: 200 }}
                  >
                    {isSearchingCustomers ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator size="small" color="#e8452c" />
                        <Text className="mt-1.5 text-[11px] text-ink-soft">Searching...</Text>
                      </View>
                    ) : displayedCustomers.length === 0 ? (
                      <View className="p-3 items-center">
                        <Text className="text-xs text-ink-soft">
                          {customerSearch.trim()
                            ? `No customers matching "${customerSearch.trim()}"`
                            : "No customers found"}
                        </Text>
                      </View>
                    ) : (
                      displayedCustomers.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            setSelectedCustomerId(Number(c.id));
                            setCustomerPickerOpen(false);
                            setCustomerSearch("");
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
                              : "active:bg-surface-soft"
                          }`}
                        >
                          <View className="flex-1 pr-2">
                            <Text
                              className={`text-xs ${
                                Number(c.id) === selectedCustomerId
                                  ? "font-bold text-brand"
                                  : "font-medium text-ink"
                              }`}
                            >
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
                      ))
                    )}
                  </ScrollView>
                </View>
              )}

              {formErrors.customer && (
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

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => {
                    const now = new Date();
                    setDateObject(now);
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, "0");
                    const d = String(now.getDate()).padStart(2, "0");
                    setOrderDate(`${y}-${m}-${d}`);
                    setShowDatePicker(false);
                  }}
                  className={`flex-1 h-10 flex-row items-center justify-center gap-1.5 rounded-xl border ${
                    orderDate === new Date().toISOString().split("T")[0]
                      ? "border-brand bg-brand/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <Calendar
                    size={14}
                    color={
                      orderDate === new Date().toISOString().split("T")[0]
                        ? "#e8452c"
                        : "#79726b"
                    }
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      orderDate === new Date().toISOString().split("T")[0]
                        ? "text-brand"
                        : "text-ink-soft"
                    }`}
                  >
                    Today
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setDateObject(yesterday);
                    const y = yesterday.getFullYear();
                    const m = String(yesterday.getMonth() + 1).padStart(2, "0");
                    const d = String(yesterday.getDate()).padStart(2, "0");
                    setOrderDate(`${y}-${m}-${d}`);
                    setShowDatePicker(false);
                  }}
                  className={`flex-1 h-10 flex-row items-center justify-center gap-1.5 rounded-xl border ${
                    orderDate ===
                    new Date(Date.now() - 86400000).toISOString().split("T")[0]
                      ? "border-brand bg-brand/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      orderDate ===
                      new Date(Date.now() - 86400000).toISOString().split("T")[0]
                        ? "text-brand"
                        : "text-ink-soft"
                    }`}
                  >
                    Yesterday
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  className={`flex-1 h-10 flex-row items-center justify-center gap-1.5 rounded-xl border ${
                    showDatePicker ||
                    (orderDate !== new Date().toISOString().split("T")[0] &&
                      orderDate !==
                        new Date(Date.now() - 86400000)
                          .toISOString()
                          .split("T")[0])
                      ? "border-brand bg-brand/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      showDatePicker ||
                      (orderDate !== new Date().toISOString().split("T")[0] &&
                        orderDate !==
                          new Date(Date.now() - 86400000)
                            .toISOString()
                            .split("T")[0])
                        ? "text-brand"
                        : "text-ink-soft"
                    }`}
                  >
                    {orderDate}
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
                        <Text className="text-xs font-bold text-white">Done</Text>
                      </Pressable>
                    </View>
                    <DateTimePicker
                      value={dateObject}
                      mode="date"
                      display="inline"
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
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Order Items ({items.length})
                </Text>
                <Pressable
                  onPress={handleAddItem}
                  className="flex-row items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 active:opacity-75"
                >
                  <Plus size={12} color="#e8452c" />
                  <Text className="text-xs font-bold text-brand">Add Item</Text>
                </Pressable>
              </View>

              {items.map((it, idx) => {
                const isDropdownOpen = openProductDropdownIndex === idx;

                return (
                  <View
                    key={idx}
                    className="mb-2.5 rounded-xl border border-border bg-surface p-3"
                  >
                    <View className="flex-row items-center justify-between pb-1.5">
                      <Text className="text-[11px] font-bold text-ink-soft uppercase">
                        Item #{idx + 1}
                      </Text>
                      {items.length > 1 && (
                        <Pressable
                          onPress={() => handleRemoveItem(idx)}
                          className="h-6 w-6 items-center justify-center rounded bg-red-50 active:opacity-70"
                          hitSlop={8}
                        >
                          <Trash2 size={12} color="#e8452c" />
                        </Pressable>
                      )}
                    </View>

                    {/* Product Selection Trigger */}
                    <Pressable
                      onPress={() => {
                        setProductSearch("");
                        setOpenProductDropdownIndex(
                          isDropdownOpen ? null : idx,
                        );
                      }}
                      className="mt-1 flex-row items-center justify-between rounded-xl border border-border bg-background p-2.5 active:bg-surface-soft"
                    >
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-center gap-2">
                          <Package size={15} color="#e8452c" />
                          <Text
                            numberOfLines={1}
                            className={`text-xs ${
                              it.product
                                ? "font-bold text-ink"
                                : "font-medium text-ink-soft"
                            }`}
                          >
                            {it.product?.product_name ||
                              "Tap to select product..."}
                          </Text>

                          {it.product ? (
                            <View className="rounded bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
                              <Text className="text-[9px] font-bold text-emerald-700">
                                Stock: {it.product.quantity}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {it.product && (
                          <View className="mt-1.5 flex-row items-center gap-2">
                            <View className="rounded bg-border/40 px-1.5 py-0.5">
                              <Text className="text-[10px] font-bold text-ink-soft">
                                ID:{" "}
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
                        )}
                      </View>

                      <ChevronDown
                        size={15}
                        color="#79726b"
                        style={{
                          transform: [
                            { rotate: isDropdownOpen ? "180deg" : "0deg" },
                          ],
                        }}
                      />
                    </Pressable>

                    {/* Product Search & Dropdown Picker */}
                    {isDropdownOpen && (
                      <View className="mt-2 rounded-xl border border-border bg-background p-2 shadow-lg">
                        <View className="mb-2 flex-row items-center rounded-lg border border-border bg-surface px-2.5 py-1.5">
                          <Search size={14} color="#79726b" />
                          <TextInput
                            value={productSearch}
                            onChangeText={setProductSearch}
                            placeholder="Filter product by name or ID..."
                            placeholderTextColor="#79726b"
                            className="ml-2 flex-1 text-xs text-ink p-0"
                            autoFocus
                          />
                          {productSearch.length > 0 && (
                            <Pressable
                              onPress={() => setProductSearch("")}
                              hitSlop={8}
                            >
                              <X size={13} color="#79726b" />
                            </Pressable>
                          )}
                        </View>

                        <ScrollView
                          nestedScrollEnabled
                          className="max-h-48"
                          showsVerticalScrollIndicator={true}
                        >
                          {filteredProducts.length === 0 ? (
                            <View className="py-4 items-center">
                              <Text className="text-xs text-ink-soft">
                                No products found
                              </Text>
                            </View>
                          ) : (
                            filteredProducts.map((prod) => {
                              const isSelected =
                                (prod.inventory_id ?? prod.product_id) ===
                                it.inventory_id;

                              return (
                                <Pressable
                                  key={prod.inventory_id ?? prod.product_id}
                                  onPress={() =>
                                    handleSelectProduct(idx, prod)
                                  }
                                  className={`flex-row items-center justify-between rounded-lg p-2 mb-1 border ${
                                    isSelected
                                      ? "border-brand/40 bg-brand/10"
                                      : "border-transparent bg-surface active:bg-surface-soft"
                                  }`}
                                >
                                  <View className="flex-1 pr-2">
                                    <View className="flex-row items-center gap-1.5">
                                      <Text
                                        numberOfLines={1}
                                        className={`text-xs ${
                                          isSelected
                                            ? "font-bold text-brand"
                                            : "font-semibold text-ink"
                                        }`}
                                      >
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
                                            ? "bg-emerald-50"
                                            : "bg-red-50"
                                        }`}
                                      >
                                        <Text
                                          className={`text-[9px] font-bold ${
                                            prod.quantity > 0
                                              ? "text-emerald-700"
                                              : "text-red-700"
                                          }`}
                                        >
                                          Stock: {prod.quantity}
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

                    {/* Quantity Controls */}
                    <View className="mt-2.5 flex-row items-center justify-between border-t border-border/40 pt-2">
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
                              (it.product?.total_amount || 0) * it.quantity
                            ).toLocaleString()}
                          </Text>
                        )}
                      </View>

                      <View className="flex-row items-center gap-2">
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
                          className={`h-8 w-8 items-center justify-center rounded-lg border ${
                            it.quantity <= 1
                              ? "border-border/40 bg-surface opacity-40"
                              : "border-border bg-surface active:bg-surface-soft"
                          }`}
                        >
                          <Minus size={13} color="#241a12" />
                        </Pressable>

                        <TextInput
                          value={String(it.quantity)}
                          onChangeText={(v) => {
                            const val = parseInt(v, 10);
                            handleUpdateItem(
                              idx,
                              "quantity",
                              isNaN(val) ? 1 : Math.max(1, val),
                            );
                          }}
                          keyboardType="numeric"
                          className="h-8 min-w-[36px] rounded-lg border border-border bg-surface px-2 text-center text-xs font-bold text-ink"
                        />

                        <Pressable
                          onPress={() =>
                            handleUpdateItem(idx, "quantity", it.quantity + 1)
                          }
                          className="h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface active:bg-surface-soft"
                        >
                          <Plus size={13} color="#241a12" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}

              {formErrors.items && (
                <Text className="mt-1 text-xs text-red-500">
                  {formErrors.items}
                </Text>
              )}
            </View>

            {/* 4. Payment & Order Details */}
            <View className="mb-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Payment Details
                </Text>
                {calculatedTotal > 0 && (
                  <Pressable
                    onPress={() => {
                      setTotalAmount(String(calculatedTotal));
                      if (isPrePaid) {
                        setPaidAmount(String(calculatedTotal));
                      }
                      if (formErrors.total_amount) {
                        setFormErrors((prev) => ({
                          ...prev,
                          total_amount: "",
                        }));
                      }
                    }}
                    className="flex-row items-center gap-1 rounded bg-brand/10 px-2 py-0.5 active:opacity-75"
                  >
                    <Text className="text-[10px] font-bold text-brand">
                      Apply Sum: Rs. {calculatedTotal.toLocaleString()}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Total Amount Input */}
              <View className="mb-3">
                <Text className="mb-1 text-xs font-medium text-ink">
                  Total Order Amount (Rs.) *
                </Text>
                <TextInput
                  value={totalAmount}
                  onChangeText={handleTotalAmountChange}
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

              {/* Remarks / Credit Terms (Placed below Total Amount) */}
              <View className="mb-3">
                <Text className="mb-1 text-xs font-medium text-ink">
                  Remarks / Credit Terms
                </Text>
                <TextInput
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="e.g. Delivered to shop, credit due in 30 days"
                  placeholderTextColor="#79726b"
                  multiline
                  numberOfLines={2}
                  className="min-h-[60px] rounded-xl border border-border bg-surface p-3 text-xs text-ink"
                />
              </View>

            </View>

            {/* 5. Pre-paid Toggle & Prepayment Section (At the last) */}
            <View className="mb-6 rounded-2xl border border-border bg-surface/50 p-4">
              {/* Pre-paid Toggle Row */}
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-bold text-ink">
                      Pre-paid
                    </Text>
                    {isPrePaid && (
                      <View className="rounded bg-emerald-50 px-1.5 py-0.2 border border-emerald-200">
                        <Text className="text-[9px] font-bold text-emerald-700">
                          Active
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-ink-soft mt-0.5">
                    {isPrePaid
                      ? "Prepayment / advance payment collected"
                      : "No advance payment (Full order on credit)"}
                  </Text>
                </View>
                <Switch
                  value={isPrePaid}
                  onValueChange={handleTogglePrePaid}
                  trackColor={{ false: "#e4dfda", true: "#e8452c" }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#e4dfda"
                />
              </View>

              {/* View Prepayment Section only when toggle is ON */}
              {isPrePaid ? (
                <View className="mt-4 pt-4 border-t border-border/60">
                  {/* Paid Amount Input */}
                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-xs font-medium text-ink">
                        Paid Amount (Rs.) *
                      </Text>
                      {Boolean(
                        totalAmount &&
                          parseFloat(paidAmount) !== parseFloat(totalAmount),
                      ) && (
                        <Pressable
                          onPress={() => setPaidAmount(totalAmount)}
                          className="rounded bg-emerald-50 px-2 py-0.5"
                        >
                          <Text className="text-[10px] font-bold text-emerald-700">
                            Full Amount
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    <TextInput
                      value={paidAmount}
                      onChangeText={handlePaidAmountChange}
                      placeholder="0.00"
                      placeholderTextColor="#79726b"
                      keyboardType="numeric"
                      className={`h-11 rounded-xl border bg-background px-3 text-sm font-bold text-ink ${
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

                  {/* Remaining Balance Preview */}
                  <View
                    className={`mb-3 flex-row items-center justify-between rounded-xl border p-3 ${
                      calculatedRemaining === 0
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-border bg-background"
                    }`}
                  >
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-xs font-medium text-ink-soft">
                        Remaining Balance (Credit):
                      </Text>
                      {calculatedRemaining === 0 && (
                        <CheckCircle2 size={13} color="#15803d" />
                      )}
                    </View>
                    <Text
                      className={`text-sm font-bold ${
                        calculatedRemaining === 0
                          ? "text-emerald-700"
                          : "text-amber-600"
                      }`}
                    >
                      Rs. {calculatedRemaining.toLocaleString()}
                    </Text>
                  </View>

                  {/* Payment Method Selector */}
                  <View className="mb-3">
                    <Text className="mb-1 text-xs font-medium text-ink">
                      Payment Method
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {PAYMENT_METHODS.map((pm) => {
                        const isSelected = paymentMethod === pm.key;
                        return (
                          <Pressable
                            key={pm.key}
                            onPress={() => {
                              setPaymentMethod(pm.key);
                              if (pm.key === "cash") {
                                setFormErrors((prev) => {
                                  const n = { ...prev };
                                  delete n.payment_screenshot;
                                  return n;
                                });
                              }
                            }}
                            className={`rounded-xl border px-3 py-2 ${
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

                  {/* Payment Receipt / Screenshot Section (Compulsory for non-cash) */}
                  {paymentMethod !== "cash" && (
                    <View
                      className={`rounded-2xl border ${
                        formErrors.payment_screenshot
                          ? "border-red-500 bg-red-50/30"
                          : "border-dashed border-border bg-background"
                      } p-3.5`}
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1.5">
                          <DollarSign size={14} color="#e8452c" />
                          <Text className="text-xs font-bold text-ink">
                            Payment Screenshot / Receipt *
                          </Text>
                        </View>
                        <View className="rounded bg-red-100 px-2 py-0.5 border border-red-200">
                          <Text className="text-[10px] font-bold text-red-700 uppercase">
                            Compulsory
                          </Text>
                        </View>
                      </View>

                      {paymentScreenshot ? (
                        <View className="rounded-xl border border-border bg-surface p-2.5">
                          <View className="relative">
                            <Image
                              source={{ uri: paymentScreenshot.uri }}
                              className="h-36 w-full rounded-lg"
                              contentFit="contain"
                            />
                            <View className="mt-2 flex-row items-center justify-between">
                              <Text
                                numberOfLines={1}
                                className="text-xs font-semibold text-ink flex-1 mr-2"
                              >
                                {paymentScreenshot.name}
                              </Text>
                              <View className="flex-row items-center gap-1.5">
                                <Pressable
                                  onPress={handlePickImage}
                                  className="flex-row items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 active:opacity-70"
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
                        <View className="items-center py-2">
                          <Text className="text-xs text-ink-soft text-center mb-2.5">
                            Please upload receipt or QR confirmation screenshot
                          </Text>
                          <View className="flex-row items-center gap-3">
                            <Pressable
                              onPress={handlePickImage}
                              className="flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 shadow-sm active:opacity-75"
                            >
                              <ImageIcon size={14} color="#241a12" />
                              <Text className="text-xs font-semibold text-ink">
                                Gallery
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={handleTakePhoto}
                              className="flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 shadow-sm active:opacity-75"
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
                        <Text className="mt-2 text-xs font-medium text-red-500">
                          {formErrors.payment_screenshot}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View className="mt-2.5 rounded-xl bg-background/80 p-2.5 border border-border/50">
                  <Text className="text-xs text-ink-soft text-center">
                    Full order will be on credit:{" "}
                    <Text className="font-bold text-ink">
                      Rs. {(parseFloat(totalAmount) || 0).toLocaleString()}
                    </Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Form Action Buttons */}
            <View className="flex-row items-center gap-3 pb-6">
              <Pressable
                onPress={onClose}
                disabled={createMutation.isPending}
                className="flex-1 h-12 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
              >
                <Text className="text-sm font-semibold text-ink">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
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
  );
}
