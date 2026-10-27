// src/app/(tabs)/index.tsx — Home screen

import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Package } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
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

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : "";

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
            <Text className="text-2xl font-bold text-ink">0</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-border bg-surface px-4 py-5">
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Pending
            </Text>
            <Text className="text-2xl font-bold text-ink">0</Text>
          </View>
        </View>

        {/* Placeholder section */}
        <View className="items-center justify-center rounded-2xl border border-border bg-surface py-16">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-brand/10">
            <Package size={22} color="#e8452c" />
          </View>
          <Text className="font-semibold text-ink">No orders yet</Text>
          <Text className="mt-1 text-sm text-ink-soft">
            Your orders will appear here
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
