// src/app/customers/[id].tsx — Customer Details Screen

import React, { useMemo, useState } from "react";
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
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  ShoppingBag,
  Store,
  Trash2,
  User,
} from "lucide-react-native";
import {
  useCustomerDetailQuery,
  useDeleteCustomerMutation,
} from "@/hooks/useCustomerQueries";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { useAuth } from "@/context/AuthContext";
import type { OfflineCustomer } from "@/types/customer";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [editModalVisible, setEditModalVisible] = useState(false);

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

  const { paidPercentage, remainingPercentage } = useMemo(() => {
    if (totalPurchased <= 0) {
      return { paidPercentage: 100, remainingPercentage: 0 };
    }
    const paidPct = Math.min(
      100,
      Math.max(0, Math.round((totalPaid / totalPurchased) * 100)),
    );
    return {
      paidPercentage: paidPct,
      remainingPercentage: 100 - paidPct,
    };
  }, [totalPurchased, totalPaid]);

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "This customer has no phone number recorded.");
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
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
          >
            <ArrowLeft size={18} color="#241a12" strokeWidth={2.2} />
          </Pressable>
          <View>
            <Text className="text-base font-bold text-ink">Customer Details</Text>
            {Boolean(customer?.store_name) && (
              <Text numberOfLines={1} className="text-xs text-ink-soft">
                {customer?.store_name}
              </Text>
            )}
          </View>
        </View>

        {customer && (
          <View className="flex-row items-center gap-2">
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
            <View className="flex-row items-start justify-between">
              <View className="flex-1 flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                  <Store size={24} color="#e8452c" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-ink">
                    {customer.store_name}
                  </Text>
                </View>
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
                      customer.is_active
                        ? "text-emerald-700"
                        : "text-gray-600"
                    }`}
                  >
                    {customer.is_active ? "Active" : "Inactive"}
                  </Text>
                </View>
              )}
            </View>

            <View className="my-3.5 h-px bg-border/60" />

            {/* Contact Person, Phone, Address Info */}
            <View className="gap-2.5">
              {/* Contact Person */}
              <View className="flex-row items-center gap-2.5">
                <View className="h-7 w-7 items-center justify-center rounded-lg bg-background">
                  <User size={14} color="#79726b" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-medium text-ink-soft">
                    Contact Person
                  </Text>
                  <Text className="text-sm font-semibold text-ink">
                    {customer.contact_person || "—"}
                  </Text>
                </View>
              </View>

              {/* Phone Number + Quick Dial */}
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center gap-2.5">
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-background">
                    <Phone size={14} color="#79726b" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-medium text-ink-soft">
                      Phone Number
                    </Text>
                    <Text className="text-sm font-semibold text-ink">
                      {customer.phone_number || "—"}
                    </Text>
                  </View>
                </View>

                {Boolean(customer.phone_number) && (
                  <Pressable
                    onPress={() => handleCall(customer.phone_number)}
                    className="flex-row items-center gap-1.5 rounded-xl bg-brand/10 px-3 py-1.5 active:opacity-75"
                  >
                    <Phone size={12} color="#e8452c" />
                    <Text className="text-xs font-bold text-brand">Call</Text>
                  </Pressable>
                )}
              </View>

              {/* Address */}
              <View className="flex-row items-start gap-2.5">
                <View className="h-7 w-7 items-center justify-center rounded-lg bg-background">
                  <MapPin size={14} color="#79726b" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-medium text-ink-soft">
                    Store Address
                  </Text>
                  <Text className="text-sm font-medium leading-5 text-ink">
                    {customer.address || "No address specified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Financial Overview Section */}
          <View>
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Financial & Sales Overview
            </Text>

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
              <View className="flex-1 min-w-[45%] rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-emerald-800">
                    Total Paid
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle2 size={14} color="#059669" />
                  </View>
                </View>
                <Text className="mt-2 text-xl font-bold text-emerald-800">
                  {formatCurrency(totalPaid)}
                </Text>
                <Text className="mt-0.5 text-[11px] text-emerald-700">
                  Collected amount
                </Text>
              </View>

              {/* Remaining Balance Card */}
              <View
                className={`flex-1 min-w-[45%] rounded-2xl border p-3.5 shadow-sm ${
                  totalRemaining > 0
                    ? "border-amber-200 bg-amber-50/60"
                    : "border-border bg-surface"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-xs font-semibold ${
                      totalRemaining > 0 ? "text-amber-800" : "text-ink-soft"
                    }`}
                  >
                    Remaining Due
                  </Text>
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-lg ${
                      totalRemaining > 0 ? "bg-amber-100" : "bg-background"
                    }`}
                  >
                    <Clock
                      size={14}
                      color={totalRemaining > 0 ? "#d97706" : "#79726b"}
                    />
                  </View>
                </View>
                <Text
                  className={`mt-2 text-xl font-bold ${
                    totalRemaining > 0 ? "text-amber-900" : "text-ink"
                  }`}
                >
                  {formatCurrency(totalRemaining)}
                </Text>
                <Text
                  className={`mt-0.5 text-[11px] ${
                    totalRemaining > 0 ? "text-amber-700" : "text-ink-soft"
                  }`}
                >
                  Outstanding balance
                </Text>
              </View>
            </View>

            {/* Payment Progress Bar */}
            {totalPurchased > 0 && (
              <View className="mt-3 rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
                <View className="flex-row items-center justify-between text-xs">
                  <Text className="text-xs font-semibold text-ink">
                    Payment Status
                  </Text>
                  <Text className="text-xs font-bold text-brand">
                    {paidPercentage}% Paid
                  </Text>
                </View>

                {/* Progress bar track */}
                <View className="mt-2.5 h-2 w-full flex-row overflow-hidden rounded-full bg-border">
                  <View
                    style={{ width: `${paidPercentage}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                  {remainingPercentage > 0 && (
                    <View
                      style={{ width: `${remainingPercentage}%` }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  )}
                </View>

                <View className="mt-2.5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-full bg-emerald-500" />
                    <Text className="text-[11px] font-medium text-ink-soft">
                      Paid: {formatCurrency(totalPaid)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-full bg-amber-500" />
                    <Text className="text-[11px] font-medium text-ink-soft">
                      Due: {formatCurrency(totalRemaining)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View className="mt-2 flex-row gap-3">
            {Boolean(customer.phone_number) && (
              <Pressable
                onPress={() => handleCall(customer.phone_number)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand py-3.5 shadow-sm active:opacity-85"
              >
                <Phone size={16} color="#ffffff" strokeWidth={2.2} />
                <Text className="text-sm font-bold text-white">
                  Call Customer
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => setEditModalVisible(true)}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3.5 active:opacity-75"
            >
              <Pencil size={15} color="#241a12" strokeWidth={2} />
              <Text className="text-sm font-bold text-ink">Edit Store</Text>
            </Pressable>
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
    </SafeAreaView>
  );
}
