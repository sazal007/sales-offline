// src/components/orders/OrderEditView.tsx

import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  Calendar,
  ImageIcon,
  Camera,
  AlertCircle,
  Package,
  Plus,
  Trash2,
  Minus,
  Search,
  X,
  ChevronDown,
  RefreshCw,
} from "lucide-react-native";
import type {
  OfflineOrderDetailResponse,
  OfflinePaymentMethod,
  UpdateOfflineOrderPayload,
  Product,
} from "@/types/offlineSales";
import { useProductsQuery } from "@/hooks/useOfflineOrderQueries";
import { PAYMENT_METHODS, type SelectedOrderItem } from "./orderHelpers";

interface OrderEditViewProps {
  order: OfflineOrderDetailResponse;
  onSave: (payload: UpdateOfflineOrderPayload) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  products?: Product[];
}

export function OrderEditView({
  order,
  onSave,
  onCancel,
  isSaving = false,
  products: initialProducts,
}: OrderEditViewProps) {
  // Use cached products or passed in products
  const { data: fetchedProducts = [] } = useProductsQuery();
  const products = initialProducts || fetchedProducts;

  const [items, setItems] = useState<SelectedOrderItem[]>([]);
  const [openProductDropdownIndex, setOpenProductDropdownIndex] = useState<
    number | null
  >(null);
  const [productSearch, setProductSearch] = useState("");

  const [totalAmount, setTotalAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<OfflinePaymentMethod>("cash");
  const [remarks, setRemarks] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [dateObject, setDateObject] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Initialize form state when order or products change
  useEffect(() => {
    setTotalAmount(String(order.total_amount || ""));
    setPaidAmount(String(order.paid_amount || "0"));

    const lastPayment =
      order.payment_history && order.payment_history.length > 0
        ? order.payment_history[order.payment_history.length - 1]
        : null;
    setPaymentMethod(lastPayment?.payment_method || "cash");
    setRemarks(order.remarks || "");

    const dateStr = order.order_date || new Date().toISOString().split("T")[0];
    setOrderDate(dateStr);
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        setDateObject(
          new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])),
        );
      } else {
        setDateObject(new Date());
      }
    } catch {
      setDateObject(new Date());
    }

    // Populate order items from order.items
    if (order.items && order.items.length > 0) {
      const initialItems: SelectedOrderItem[] = order.items.map((it) => {
        const matched = products.find(
          (p) =>
            (p.inventory_id ?? p.product_id) === it.inventory ||
            p.product_name === it.product_name,
        );
        return {
          inventory_id: it.inventory,
          quantity: it.quantity,
          product: matched || {
            id: it.product_id,
            inventory_id: it.inventory,
            product_id: it.product_id,
            product_name: it.product_name,
            description: "",
            quantity: it.quantity,
            total_amount: 0,
            paid_amount: 0,
            remaining_amount: 0,
            created_at: "",
          },
        };
      });
      setItems(initialItems);
    } else {
      setItems([{ inventory_id: 0, quantity: 1 }]);
    }

    setPaymentScreenshot(null);
    setFormErrors({});
    setApiError(null);
  }, [order, products]);

  // Filtered products list for dropdown
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

  // Sum of items price * quantity
  const calculatedItemsTotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const price = it.product?.total_amount || 0;
      return acc + price * (it.quantity || 1);
    }, 0);
  }, [items]);

  const calculatedRemaining = useMemo(() => {
    const tot = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    return Math.max(0, tot - paid);
  }, [totalAmount, paidAmount]);

  // Inventory Item Handlers
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

  const handleUpdateQuantity = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: qty };
      return updated;
    });
  };

  const handleSelectProduct = (index: number, product: Product) => {
    const invId = product.inventory_id ?? product.product_id;
    setItems((prev) => {
      const updated = [...prev];
      const currentQty = updated[index]?.quantity || 1;
      updated[index] = {
        inventory_id: invId,
        quantity: currentQty,
        product,
      };
      return updated;
    });
    setOpenProductDropdownIndex(null);
    setProductSearch("");
  };

  const handleApplyItemsTotal = () => {
    if (calculatedItemsTotal > 0) {
      setTotalAmount(String(calculatedItemsTotal));
      if (formErrors.total_amount) {
        setFormErrors((prev) => {
          const n = { ...prev };
          delete n.total_amount;
          return n;
        });
      }
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

    if (items.length === 0) {
      errors.items = "At least one order item is required";
    } else {
      const invalid = items.some(
        (it) => !it.inventory_id || it.inventory_id <= 0 || it.quantity <= 0,
      );
      if (invalid) {
        errors.items = "Please select a product and valid quantity for each item";
      }
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

    if (paymentMethod !== "cash" && paid > 0 && !paymentScreenshot) {
      const hasExistingScreenshot = order.payment_history?.some((p) =>
        Boolean(p.payment_screenshot),
      );
      if (!hasExistingScreenshot) {
        errors.payment_screenshot = `A screenshot is required for ${
          PAYMENT_METHODS.find((p) => p.key === paymentMethod)?.label ||
          paymentMethod
        } payments`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setApiError(null);

    const validItems = items
      .filter((it) => it.inventory_id > 0 && it.quantity > 0)
      .map((it) => ({
        inventory_id: it.inventory_id,
        quantity: it.quantity,
      }));

    const payload: UpdateOfflineOrderPayload = {
      total_amount: totalAmount.trim(),
      paid_amount: paidAmount.trim() || "0.00",
      payment_method: paymentMethod,
      order_date: orderDate,
      remarks: remarks.trim(),
      items: validItems,
      ...(paymentScreenshot ? { payment_screenshot: paymentScreenshot } : {}),
    };

    try {
      await onSave(payload);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update order.";
      setApiError(msg);
    }
  };

  return (
    <>
      {apiError && (
        <View className="mb-4 flex-row items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5">
          <AlertCircle size={18} color="#e8452c" />
          <Text className="flex-1 text-xs font-medium text-brand">
            {apiError}
          </Text>
        </View>
      )}

      {/* 1. Order Items (Inventory Selection & Quantity) */}
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

        {formErrors.items && (
          <Text className="mb-2 text-xs font-medium text-red-500">
            {formErrors.items}
          </Text>
        )}

        {items.map((it, idx) => {
          const isDropdownOpen = openProductDropdownIndex === idx;

          return (
            <View
              key={idx}
              className="mb-2.5 rounded-2xl border border-border bg-surface p-3.5 shadow-sm"
            >
              {/* Item Header */}
              <View className="flex-row items-center justify-between pb-1.5">
                <Text className="text-[11px] font-bold uppercase text-ink-soft">
                  Item #{idx + 1}
                </Text>
                {items.length > 1 && (
                  <Pressable
                    onPress={() => handleRemoveItem(idx)}
                    className="h-6 w-6 items-center justify-center rounded-lg bg-red-50 active:opacity-70"
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
                  setOpenProductDropdownIndex(isDropdownOpen ? null : idx);
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
                      {it.product?.product_name || "Tap to select product..."}
                    </Text>

                    {it.product && it.product.quantity !== undefined ? (
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
                          Inventory ID:{" "}
                          {it.product.inventory_id ?? it.product.product_id}
                        </Text>
                      </View>
                      {Boolean(
                        it.product.total_amount && it.product.total_amount > 0,
                      ) && (
                        <Text className="text-xs font-semibold text-brand">
                          Rs. {Number(it.product.total_amount).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <ChevronDown
                  size={15}
                  color="#79726b"
                  style={{
                    transform: [{ rotate: isDropdownOpen ? "180deg" : "0deg" }],
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
                      placeholder="Filter by product name or ID..."
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
                          No matching products found
                        </Text>
                      </View>
                    ) : (
                      filteredProducts.map((p) => {
                        const isChosen =
                          it.inventory_id ===
                          (p.inventory_id ?? p.product_id);
                        return (
                          <Pressable
                            key={p.inventory_id ?? p.product_id}
                            onPress={() => handleSelectProduct(idx, p)}
                            className={`flex-row items-center justify-between rounded-lg p-2.5 mb-1 ${
                              isChosen ? "bg-brand/10" : "active:bg-surface"
                            }`}
                          >
                            <View className="flex-1 pr-2">
                              <Text
                                className={`text-xs ${
                                  isChosen
                                    ? "font-bold text-brand"
                                    : "font-semibold text-ink"
                                }`}
                                numberOfLines={1}
                              >
                                {p.product_name}
                              </Text>
                              <Text className="text-[10px] text-ink-soft">
                                ID: {p.inventory_id ?? p.product_id} • Stock:{" "}
                                {p.quantity}
                              </Text>
                            </View>
                            {Boolean(p.total_amount) && (
                              <Text className="text-xs font-bold text-ink">
                                Rs. {Number(p.total_amount).toLocaleString()}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Quantity Stepper */}
              <View className="mt-3 flex-row items-center justify-between border-t border-border/60 pt-2.5">
                <Text className="text-xs font-semibold text-ink-soft">
                  Quantity
                </Text>
                <View className="flex-row items-center rounded-xl border border-border bg-background">
                  <Pressable
                    onPress={() =>
                      handleUpdateQuantity(idx, it.quantity - 1)
                    }
                    className="h-8 w-8 items-center justify-center active:bg-surface-soft"
                    hitSlop={4}
                  >
                    <Minus size={13} color="#79726b" />
                  </Pressable>
                  <TextInput
                    value={String(it.quantity || "")}
                    onChangeText={(val) => {
                      const n = parseInt(val, 10);
                      handleUpdateQuantity(idx, isNaN(n) ? 1 : n);
                    }}
                    keyboardType="numeric"
                    className="h-8 min-w-[40px] text-center text-xs font-bold text-ink"
                  />
                  <Pressable
                    onPress={() =>
                      handleUpdateQuantity(idx, it.quantity + 1)
                    }
                    className="h-8 w-8 items-center justify-center active:bg-surface-soft"
                    hitSlop={4}
                  >
                    <Plus size={13} color="#79726b" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        {/* Calculated Items Total Pill & Quick Apply */}
        {calculatedItemsTotal > 0 && (
          <View className="mt-1 flex-row items-center justify-between rounded-xl border border-border bg-surface p-2.5">
            <View>
              <Text className="text-[10px] font-medium text-ink-soft">
                Calculated Items Value
              </Text>
              <Text className="text-xs font-bold text-ink">
                Rs. {calculatedItemsTotal.toLocaleString()}
              </Text>
            </View>
            {parseFloat(totalAmount) !== calculatedItemsTotal && (
              <Pressable
                onPress={handleApplyItemsTotal}
                className="flex-row items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 active:opacity-75"
              >
                <RefreshCw size={11} color="#e8452c" />
                <Text className="text-xs font-bold text-brand">
                  Apply to Total
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* 2. Order Date */}
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Order Date
        </Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="h-12 flex-row items-center justify-between rounded-xl border border-border bg-surface px-4 active:bg-surface-soft"
        >
          <View className="flex-row items-center gap-2.5">
            <Calendar size={16} color="#e8452c" />
            <Text className="text-sm font-medium text-ink">{orderDate}</Text>
          </View>
          <Text className="text-xs font-semibold text-brand">Change</Text>
        </Pressable>

        {showDatePicker && (
          <View className="mt-2 rounded-xl border border-border bg-surface p-2">
            <DateTimePicker
              value={dateObject}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(
                event: DateTimePickerEvent,
                selectedDate?: Date,
              ) => {
                if (Platform.OS !== "ios") {
                  setShowDatePicker(false);
                }
                if (selectedDate) {
                  setDateObject(selectedDate);
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(
                    2,
                    "0",
                  );
                  const day = String(selectedDate.getDate()).padStart(2, "0");
                  setOrderDate(`${year}-${month}-${day}`);
                }
              }}
            />
            {Platform.OS === "ios" && (
              <Pressable
                onPress={() => setShowDatePicker(false)}
                className="mt-2 h-9 items-center justify-center rounded-lg bg-brand"
              >
                <Text className="text-xs font-bold text-white">Done</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* 3. Total Amount */}
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Total Order Amount (Rs.) *
        </Text>
        <View
          className={`flex-row items-center rounded-xl border bg-surface px-4 ${
            formErrors.total_amount ? "border-red-500" : "border-border"
          }`}
        >
          <Text className="mr-1 text-sm font-bold text-ink-soft">Rs.</Text>
          <TextInput
            value={totalAmount}
            onChangeText={(val) => {
              setTotalAmount(val);
              if (formErrors.total_amount) {
                setFormErrors((prev) => {
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
        {formErrors.total_amount && (
          <Text className="mt-1 text-xs font-medium text-red-500">
            {formErrors.total_amount}
          </Text>
        )}
      </View>

      {/* 4. Paid Amount */}
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Paid Amount (Rs.)
        </Text>
        <View
          className={`flex-row items-center rounded-xl border bg-surface px-4 ${
            formErrors.paid_amount ? "border-red-500" : "border-border"
          }`}
        >
          <Text className="mr-1 text-sm font-bold text-ink-soft">Rs.</Text>
          <TextInput
            value={paidAmount}
            onChangeText={(val) => {
              setPaidAmount(val);
              if (formErrors.paid_amount) {
                setFormErrors((prev) => {
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
        {formErrors.paid_amount && (
          <Text className="mt-1 text-xs font-medium text-red-500">
            {formErrors.paid_amount}
          </Text>
        )}

        {/* Remaining Balance Summary Pill */}
        <View className="mt-2.5 flex-row items-center justify-between rounded-xl border border-border bg-surface p-3">
          <Text className="text-xs font-medium text-ink-soft">
            Updated Remaining Balance:
          </Text>
          <Text
            className={`text-sm font-bold ${
              calculatedRemaining > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            Rs. {calculatedRemaining.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 5. Payment Method */}
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Payment Method
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PAYMENT_METHODS.map((pm) => {
            const isSelected = paymentMethod === pm.key;
            return (
              <Pressable
                key={pm.key}
                onPress={() => setPaymentMethod(pm.key)}
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

      {/* 6. Payment Screenshot (if non-cash & paid > 0) */}
      {paymentMethod !== "cash" && parseFloat(paidAmount) > 0 && (
        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Payment Receipt / Screenshot *
          </Text>
          {paymentScreenshot ? (
            <View className="overflow-hidden rounded-xl border border-border bg-surface">
              <Image
                source={{ uri: paymentScreenshot.uri }}
                className="h-44 w-full"
                contentFit="contain"
              />
              <View className="flex-row items-center justify-between border-t border-border bg-surface p-2.5">
                <Text
                  numberOfLines={1}
                  className="mr-2 flex-1 text-xs text-ink-soft"
                >
                  {paymentScreenshot.name}
                </Text>
                <Pressable
                  onPress={() => setPaymentScreenshot(null)}
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
                  onPress={handlePickImage}
                  className="h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface active:bg-surface-soft"
                >
                  <ImageIcon size={20} color="#79726b" />
                  <Text className="text-xs font-medium text-ink-soft">
                    Upload Photo
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleTakePhoto}
                  className="h-20 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface active:bg-surface-soft"
                >
                  <Camera size={20} color="#79726b" />
                  <Text className="text-xs font-medium text-ink-soft">
                    Take Camera
                  </Text>
                </Pressable>
              </View>
              {order.payment_history?.some((p) =>
                Boolean(p.payment_screenshot),
              ) && (
                <Text className="mt-1.5 text-[11px] font-medium text-emerald-600">
                  ✓ A receipt screenshot was previously uploaded for this order. Attach a new one only if you want to replace it.
                </Text>
              )}
            </View>
          )}
          {formErrors.payment_screenshot && (
            <Text className="mt-1 text-xs font-medium text-red-500">
              {formErrors.payment_screenshot}
            </Text>
          )}
        </View>
      )}

      {/* 7. Remarks */}
      <View className="mb-6">
        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Remarks / Credit Terms
        </Text>
        <TextInput
          value={remarks}
          onChangeText={setRemarks}
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
          onPress={onCancel}
          disabled={isSaving}
          className="h-12 flex-1 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
        >
          <Text className="text-sm font-semibold text-ink">Cancel</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={isSaving}
          className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-sm font-bold text-white">Save Changes</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}
