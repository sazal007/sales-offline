// src/app/(tabs)/profile.tsx — Profile screen

import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/auth";
import { LogOut, Mail, MapPin, Phone, Shield, User } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3.5">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-brand/10">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          {label}
        </Text>
        <Text className="mt-0.5 text-sm font-medium text-ink">
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : (user?.username ?? "—");

  const roleLabel = user?.role ? ROLE_LABELS[user.role] : "—";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name banner */}
        <View className="items-center border-b border-border bg-surface px-5 pb-8 pt-4">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-brand/10">
          <User size={36} color="#e8452c" />
        </View>
        <Text className="text-lg font-bold text-ink">{displayName}</Text>
        <View className="mt-1.5 rounded-full bg-brand/10 px-3 py-1">
          <Text className="text-xs font-semibold text-brand">{roleLabel}</Text>
        </View>
      </View>

      {/* Info section */}
      <View className="mx-5 mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <Text className="border-b border-border px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Account Info
        </Text>

        <InfoRow
          icon={<Phone size={15} color="#e8452c" />}
          label="Phone"
          value={user?.phone_number}
        />

        <View className="h-px bg-border" />

        <InfoRow
          icon={<Mail size={15} color="#e8452c" />}
          label="Email"
          value={user?.email}
        />

        <View className="h-px bg-border" />

        <InfoRow
          icon={<MapPin size={15} color="#e8452c" />}
          label="Address"
          value={user?.address}
        />

        <View className="h-px bg-border" />

        <InfoRow
          icon={<Shield size={15} color="#e8452c" />}
          label="Role"
          value={roleLabel}
        />
      </View>

      {/* Distributor / Franchise info (if applicable) */}
      {(user?.distributor_name ||
        user?.franchise_name ||
        user?.factory_name) && (
        <View className="mx-5 mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          <Text className="border-b border-border px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Assignment
          </Text>

          {user.distributor_name && (
            <InfoRow
              icon={<User size={15} color="#e8452c" />}
              label="Distributor"
              value={user.distributor_name}
            />
          )}
          {user.franchise_name && (
            <>
              <View className="h-px bg-border" />
              <InfoRow
                icon={<User size={15} color="#e8452c" />}
                label="Franchise"
                value={user.franchise_name}
              />
            </>
          )}
          {user.factory_name && (
            <>
              <View className="h-px bg-border" />
              <InfoRow
                icon={<User size={15} color="#e8452c" />}
                label="Factory"
                value={user.factory_name}
              />
            </>
          )}
        </View>
      )}

      {/* Logout */}
      <View className="mx-5 mt-6">
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50"
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#e8452c" />
          ) : (
            <>
              <LogOut size={16} color="#e8452c" />
              <Text className="text-sm font-semibold text-brand">Sign Out</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
