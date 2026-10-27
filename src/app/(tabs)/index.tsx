// src/app/(tabs)/index.tsx — Home screen

import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronRight, Package, ShoppingBag } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useOfflineOrdersQuery } from "@/hooks/useOfflineOrderQueries";
import type { UserRole } from "@/types/auth";

const ROLE_LABELS: Record<UserRole, string> = {
  SalesPerson: "Sales Person",
  Offline_SalesPerson: "Offline Sales Person",
  Distributor: "Distributor",
  SuperAdmin: "Super Admin",
  Other: "Other",
  Franchise: "Franchise",
  Factory: "Factory",
  "Treatment Staff": "Treatment Staff",
  Logistic: "Logistic",
  Packaging: "Packaging",
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: orders = [] } = useOfflineOrdersQuery();

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : "";

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const todayOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        o.order_date === todayStr ||
        o.created_at?.slice(0, 10) === todayStr,
    ).length;
  }, [orders, todayStr]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => o.order_status === "Pending").length;
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pt-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-ink">
            Hello, {user?.first_name ?? "there"} 👋
          </Text>
          <Text className="mt-1 text-sm text-ink-soft">{roleLabel}</Text>
        </View>

        {/* Stats row */}
        <View className="mb-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-border bg-surface px-4 py-5">
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Today's Orders
            </Text>
            <Text className="text-2xl font-bold text-ink">
              {todayOrdersCount}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface px-4 py-5">
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Pending
            </Text>
            <Text className="text-2xl font-bold text-amber-600">
              {pendingOrdersCount}
            </Text>
          </View>
        </View>

        {/* Recent Orders Section */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-sm font-bold uppercase tracking-wider text-ink-soft">
            Recent Orders
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/orders")}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-brand">View All</Text>
            <ChevronRight size={14} color="#e8452c" />
          </Pressable>
        </View>

        {recentOrders.length > 0 ? (
          <View className="gap-3">
            {recentOrders.map((ord) => (
              <Pressable
                key={ord.id || ord.order_code}
                onPress={() => router.push("/(tabs)/orders")}
                className="rounded-2xl border border-border bg-surface p-4 active:opacity-80"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                      <ShoppingBag size={14} color="#e8452c" />
                    </View>
                    <Text className="text-sm font-bold text-ink">
                      {ord.order_code}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-ink">
                    Rs. {Number(ord.total_amount).toLocaleString()}
                  </Text>
                </View>

                <View className="mt-2 flex-row items-center justify-between">
                  <Text numberOfLines={1} className="text-xs text-ink-soft flex-1 pr-2">
                    {ord.customer_name}
                  </Text>
                  <Text className="text-xs font-semibold text-amber-600">
                    {ord.order_status}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 py-12">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-brand/10">
              <Package size={22} color="#e8452c" />
            </View>
            <Text className="font-semibold text-ink">No orders yet</Text>
            <Text className="mt-1 text-sm text-ink-soft">
              Your orders will appear here
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/orders")}
              className="mt-4 rounded-xl bg-brand px-4 py-2 active:opacity-80"
            >
              <Text className="text-xs font-bold text-white">Create Order</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
