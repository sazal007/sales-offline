// src/app/(tabs)/index.tsx — Home screen

import { useAuth } from "@/context/AuthContext";
import { useOfflineSalesStatsQuery } from "@/hooks/useOfflineOrderQueries";
import { DutyStatusToggle } from "@/components/tracking/DutyStatusToggle";
import { DailyAttendanceCard } from "@/components/attendance/DailyAttendanceCard";
import type { UserRole } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function formatCurrency(value: string | number) {
  return `Rs. ${Number(value).toLocaleString()}`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: stats,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useOfflineSalesStatsQuery();

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : "";

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-5 pb-12 gap-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ["attendance"] });
            }}
            tintColor="#e8452c"
            colors={["#e8452c"]}
          />
        }
      >
        {/* Greeting header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2.5 justify-center">
            <Text numberOfLines={1} className="text-lg font-bold text-ink">
              {greeting}, {user?.first_name ?? "there"} 👋
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-ink-soft">
              {roleLabel}
            </Text>
          </View>

          {user?.role === "Offline_SalesPerson" || user?.role === "SalesPerson" ? (
            <DutyStatusToggle userRole={user?.role} />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
              <TrendingUp size={18} color="#e8452c" />
            </View>
          )}
        </View>

        {/* Daily Attendance Card (Salesperson role) */}
        <DailyAttendanceCard userRole={user?.role} />

        {/* Stats content */}
        {isLoading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="small" color="#e8452c" />
            <Text className="mt-2 text-xs text-ink-soft">Loading stats...</Text>
          </View>
        ) : isError || !stats ? (
          <View className="items-center justify-center rounded-2xl border border-border bg-surface py-12">
            <AlertCircle size={28} color="#e8452c" />
            <Text className="mt-2 text-sm font-semibold text-ink">
              Failed to load stats
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="mt-3 rounded-xl border border-border bg-background px-4 py-2 active:opacity-75"
            >
              <Text className="text-xs font-semibold text-ink">Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── Financial Summary ── */}
            <View>
              <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
                Financial Summary
              </Text>

              {/* Total Sales — full width highlight card */}
              <View className="mb-2.5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-ink-soft">
                    Total Sales
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-lg bg-brand/10">
                    <Wallet size={14} color="#e8452c" />
                  </View>
                </View>
                <Text className="mt-2 text-2xl font-bold text-ink">
                  {formatCurrency(stats.total_order_amount)}
                </Text>
                <Text className="mt-0.5 text-[11px] text-ink-soft">
                  Gross value across all orders
                </Text>
              </View>

              {/* Paid + Remaining side by side */}
              <View className="flex-row gap-2.5">
                <View className="flex-1 rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
                  <Text className="text-xs font-medium text-ink-soft">
                    Total Collected
                  </Text>
                  <Text className="mt-2 text-lg font-bold text-emerald-600">
                    {formatCurrency(stats.total_paid_amount)}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-ink-soft">
                    Paid amount
                  </Text>
                </View>
                <View className="flex-1 rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
                  <Text className="text-xs font-medium text-ink-soft">
                    Outstanding
                  </Text>
                  <Text
                    className={`mt-2 text-lg font-bold ${Number(stats.total_remaining_amount) > 0 ? "text-amber-600" : "text-ink"}`}
                  >
                    {formatCurrency(stats.total_remaining_amount)}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-ink-soft">
                    Remaining due
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Orders Overview ── */}
            <View>
              <View className="mb-2.5 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Orders Overview
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)/orders")}
                  className="flex-row items-center gap-1 active:opacity-70"
                >
                  <Text className="text-xs font-semibold text-brand">
                    View All
                  </Text>
                  <ArrowRight size={12} color="#e8452c" />
                </Pressable>
              </View>

              <View className="flex-row gap-2.5">
                {/* Total Orders */}
                <Pressable
                  onPress={() => router.push("/(tabs)/orders")}
                  className="flex-1 rounded-2xl border border-border bg-surface p-3.5 shadow-sm active:opacity-80"
                >
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                    <ShoppingBag size={15} color="#2563eb" />
                  </View>
                  <Text className="mt-3 text-xl font-bold text-ink">
                    {stats.total_orders}
                  </Text>
                  <Text className="mt-0.5 text-xs font-medium text-ink-soft">
                    Total Orders
                  </Text>
                </Pressable>

                {/* Pending Orders */}
                <Pressable
                  onPress={() => router.push("/(tabs)/orders")}
                  className="flex-1 rounded-2xl border border-border bg-surface p-3.5 shadow-sm active:opacity-80"
                >
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                    <Clock size={15} color="#d97706" />
                  </View>
                  <Text className="mt-3 text-xl font-bold text-amber-600">
                    {stats.pending_orders_count}
                  </Text>
                  <Text className="mt-0.5 text-xs font-medium text-ink-soft">
                    Pending
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ── Customers ── */}
            <View>
              <Text className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
                Customers
              </Text>

              <Pressable
                onPress={() => router.push("/(tabs)/customers")}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm active:opacity-80"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                      <Users size={18} color="#7c3aed" />
                    </View>
                    <View>
                      <Text className="text-2xl font-bold text-ink">
                        {stats.total_customers}
                      </Text>
                      <Text className="text-xs text-ink-soft">
                        Total customers
                      </Text>
                    </View>
                  </View>

                  <View className="items-end gap-1">
                    <View className="rounded-full bg-amber-50 px-2.5 py-1">
                      <Text className="text-xs font-bold text-amber-700">
                        {stats.customers_with_pending_credit} with credit
                      </Text>
                    </View>
                    <ArrowRight size={14} color="#79726b" />
                  </View>
                </View>
              </Pressable>
            </View>

            {/* ── Recent Orders (commented out — uncomment when ready) ── */}
            {/*
            <View>
              <View className="mb-2.5 flex-row items-center justify-between">
                <Text className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Recent Orders
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)/orders")}
                  className="flex-row items-center gap-1 active:opacity-70"
                >
                  <Text className="text-xs font-semibold text-brand">View All</Text>
                  <ArrowRight size={12} color="#e8452c" />
                </Pressable>
              </View>
              {recentOrders.map((ord) => (
                <Pressable
                  key={ord.id || ord.order_code}
                  onPress={() => router.push("/(tabs)/orders")}
                  className="mb-2.5 rounded-2xl border border-border bg-surface p-4 active:opacity-80"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-ink">{ord.order_code}</Text>
                    <Text className="text-xs font-bold text-ink">
                      Rs. {Number(ord.total_amount).toLocaleString()}
                    </Text>
                  </View>
                  <View className="mt-1.5 flex-row items-center justify-between">
                    <Text className="text-xs text-ink-soft">{ord.customer_name}</Text>
                    <Text className="text-xs font-semibold text-amber-600">{ord.order_status}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            */}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
