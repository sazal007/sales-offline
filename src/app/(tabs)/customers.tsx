// src/app/(tabs)/customers.tsx — Customers management screen

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertCircle, Plus, Search, Store, X } from "lucide-react-native";
import {
  useCustomersQuery,
  useDeleteCustomerMutation,
} from "@/hooks/useCustomerQueries";
import type { OfflineCustomer } from "@/types/customer";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<OfflineCustomer | null>(null);

  // Queries & Mutations
  const {
    data: customers = [],
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useCustomersQuery();

  const deleteMutation = useDeleteCustomerMutation();

  // Filtered customer list based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.store_name?.toLowerCase().includes(query) ||
        c.contact_person?.toLowerCase().includes(query) ||
        c.phone_number?.toLowerCase().includes(query) ||
        c.address?.toLowerCase().includes(query),
    );
  }, [customers, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (customer: OfflineCustomer) => {
    setEditingCustomer(customer);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (customer: OfflineCustomer) => {
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

  const handleCallCustomer = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Error", "Unable to open phone dialer");
    });
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="border-b border-border bg-background px-5 pb-4 pt-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-ink">Customers</Text>
            <Text className="mt-0.5 text-xs text-ink-soft">
              {customers.length}{" "}
              {customers.length === 1 ? "customer" : "customers"} registered
            </Text>
          </View>
          <Pressable
            onPress={handleOpenCreateModal}
            className="flex-row items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2.5 active:opacity-80"
          >
            <Plus size={16} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-xs font-bold text-white">Add</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="mt-3.5 flex-row items-center rounded-xl border border-border bg-surface px-3.5 py-2.5">
          <Search size={16} color="#79726b" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by store, contact, or phone..."
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
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#e8452c" />
          <Text className="mt-2 text-xs text-ink-soft">
            Loading customers...
          </Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={36} color="#e8452c" />
          <Text className="mt-3 text-center text-sm font-semibold text-ink">
            {error instanceof Error
              ? error.message
              : "Failed to load customers"}
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
          data={filteredCustomers}
          keyExtractor={(item) => String(item.id)}
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
                <Store size={22} color="#e8452c" />
              </View>
              <Text className="font-semibold text-ink">
                {searchQuery.trim()
                  ? "No matching customers"
                  : "No customers yet"}
              </Text>
              <Text className="mt-1 text-center text-xs text-ink-soft">
                {searchQuery.trim()
                  ? `No customers match "${searchQuery}"`
                  : "Add your first offline customer to begin tracking sales."}
              </Text>
              {!searchQuery.trim() && (
                <Pressable
                  onPress={handleOpenCreateModal}
                  className="mt-4 flex-row items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 active:opacity-80"
                >
                  <Plus size={15} color="#ffffff" strokeWidth={2.5} />
                  <Text className="text-xs font-bold text-white">
                    Add Customer
                  </Text>
                </Pressable>
              )}
            </View>
          }
          ItemSeparatorComponent={() => <View className="h-3.5" />}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteCustomer}
              onCall={handleCallCustomer}
            />
          )}
        />
      )}

      {/* Customer Form Modal (Create & Edit) */}
      <CustomerFormModal
        visible={modalVisible}
        editingCustomer={editingCustomer}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
}
