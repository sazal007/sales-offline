// src/app/(tabs)/customers.tsx — Customers management screen

import {
  useCreateCustomerMutation,
  useCustomersQuery,
  useDeleteCustomerMutation,
  useUpdateCustomerMutation,
} from "@/hooks/useCustomerQueries";
import type { OfflineCustomer } from "@/types/customer";
import {
  AlertCircle,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  User,
  X,
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

export default function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<OfflineCustomer | null>(null);

  // Form states
  const [storeName, setStoreName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Queries & Mutations
  const {
    data: customers = [],
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useCustomersQuery();

  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
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

  // Open modal for creating
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setStoreName("");
    setContactPerson("");
    setPhoneNumber("");
    setAddress("");
    setFormErrors({});
    setApiError(null);
    setModalVisible(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (customer: OfflineCustomer) => {
    setEditingCustomer(customer);
    setStoreName(customer.store_name || "");
    setContactPerson(customer.contact_person || "");
    setPhoneNumber(customer.phone_number || "");
    setAddress(customer.address || "");
    setFormErrors({});
    setApiError(null);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingCustomer(null);
    setFormErrors({});
    setApiError(null);
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!storeName.trim()) {
      errors.store_name = "Store name is required";
    }
    if (!contactPerson.trim()) {
      errors.contact_person = "Contact person is required";
    }
    if (!phoneNumber.trim()) {
      errors.phone_number = "Phone number is required";
    }
    if (!address.trim()) {
      errors.address = "Address is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit create or edit
  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    setApiError(null);

    const payload = {
      store_name: storeName.trim(),
      contact_person: contactPerson.trim(),
      phone_number: phoneNumber.trim(),
      address: address.trim(),
    };

    try {
      if (editingCustomer) {
        await updateMutation.mutateAsync({
          id: editingCustomer.id,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      handleCloseModal();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save customer. Please try again.";
      setApiError(msg);
    }
  };

  // Handle Delete
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

  // Handle Phone Call
  const handleCallCustomer = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Error", "Unable to open phone dialer");
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
            className="mt-4 rounded-xl bg-surface px-5 py-2.5 border border-border active:opacity-80"
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
            <View className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              {/* Card Header: Store Name + Edit/Delete actions */}
              <View className="flex-row items-start justify-between">
                <View className="flex-1 flex-row items-center gap-2.5 pr-2">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
                    <Store size={18} color="#e8452c" />
                  </View>
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-base font-bold text-ink"
                    >
                      {item.store_name}
                    </Text>
                  </View>
                </View>

                {/* Edit & Delete Action Buttons */}
                <View className="flex-row items-center gap-1">
                  <Pressable
                    onPress={() => handleOpenEditModal(item)}
                    className="h-8 w-8 items-center justify-center rounded-lg bg-background border border-border active:opacity-70"
                    hitSlop={4}
                  >
                    <Pencil size={13} color="#241a12" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteCustomer(item)}
                    className="h-8 w-8 items-center justify-center rounded-lg bg-red-50 border border-red-200 active:opacity-70"
                    hitSlop={4}
                  >
                    <Trash2 size={13} color="#e8452c" />
                  </Pressable>
                </View>
              </View>

              {/* Card Divider */}
              <View className="my-3 h-px bg-border/60" />

              {/* Contact Info Rows */}
              <View className="gap-2">
                {/* Contact Person */}
                <View className="flex-row items-center gap-2">
                  <User size={14} color="#79726b" />
                  <Text className="text-xs font-medium text-ink">
                    {item.contact_person || "—"}
                  </Text>
                </View>

                {/* Phone with Quick Call Button */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Phone size={14} color="#79726b" />
                    <Text className="text-xs font-medium text-ink">
                      {item.phone_number || "—"}
                    </Text>
                  </View>
                  {Boolean(item.phone_number) && (
                    <Pressable
                      onPress={() => handleCallCustomer(item.phone_number)}
                      className="flex-row items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 active:opacity-70"
                    >
                      <Phone size={11} color="#e8452c" />
                      <Text className="text-[11px] font-semibold text-brand">
                        Call
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Address */}
                <View className="flex-row items-start gap-2 pt-0.5">
                  <MapPin size={14} color="#79726b" style={{ marginTop: 1 }} />
                  <Text
                    numberOfLines={2}
                    className="flex-1 text-xs text-ink-soft leading-4"
                  >
                    {item.address || "No address provided"}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Customer Form Modal (Create & Edit) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/50"
        >
          <Pressable className="flex-1" onPress={handleCloseModal} />
          <View className="max-h-[88%] rounded-t-3xl border-t border-border bg-background pb-8 pt-5 shadow-2xl">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-6 pb-4 border-b border-border">
              <View>
                <Text className="text-lg font-bold text-ink">
                  {editingCustomer ? "Edit Customer" : "New Customer"}
                </Text>
                <Text className="text-xs text-ink-soft">
                  {editingCustomer
                    ? "Update store and contact details"
                    : "Add an offline store customer"}
                </Text>
              </View>
              <Pressable
                onPress={handleCloseModal}
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

              {/* Store Name Input */}
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Store Name *
                </Text>
                <View className="relative justify-center">
                  <Store
                    size={16}
                    color="#79726b"
                    style={{ position: "absolute", left: 12, zIndex: 1 }}
                  />
                  <TextInput
                    value={storeName}
                    onChangeText={(val) => {
                      setStoreName(val);
                      if (formErrors.store_name) {
                        setFormErrors((prev) => ({ ...prev, store_name: "" }));
                      }
                    }}
                    placeholder="e.g. Kathmandu Grocery Mart"
                    placeholderTextColor="#79726b"
                    className={`h-11 rounded-xl border bg-surface pl-10 pr-3 text-sm text-ink ${
                      formErrors.store_name ? "border-red-500" : "border-border"
                    }`}
                  />
                </View>
                {Boolean(formErrors.store_name) && (
                  <Text className="mt-1 text-xs text-red-500">
                    {formErrors.store_name}
                  </Text>
                )}
              </View>

              {/* Contact Person Input */}
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Contact Person *
                </Text>
                <View className="relative justify-center">
                  <User
                    size={16}
                    color="#79726b"
                    style={{ position: "absolute", left: 12, zIndex: 1 }}
                  />
                  <TextInput
                    value={contactPerson}
                    onChangeText={(val) => {
                      setContactPerson(val);
                      if (formErrors.contact_person) {
                        setFormErrors((prev) => ({
                          ...prev,
                          contact_person: "",
                        }));
                      }
                    }}
                    placeholder="e.g. Ramesh Sharma"
                    placeholderTextColor="#79726b"
                    className={`h-11 rounded-xl border bg-surface pl-10 pr-3 text-sm text-ink ${
                      formErrors.contact_person
                        ? "border-red-500"
                        : "border-border"
                    }`}
                  />
                </View>
                {Boolean(formErrors.contact_person) && (
                  <Text className="mt-1 text-xs text-red-500">
                    {formErrors.contact_person}
                  </Text>
                )}
              </View>

              {/* Phone Number Input */}
              <View className="mb-4">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Phone Number *
                </Text>
                <View className="relative justify-center">
                  <Phone
                    size={16}
                    color="#79726b"
                    style={{ position: "absolute", left: 12, zIndex: 1 }}
                  />
                  <TextInput
                    value={phoneNumber}
                    onChangeText={(val) => {
                      setPhoneNumber(val);
                      if (formErrors.phone_number) {
                        setFormErrors((prev) => ({
                          ...prev,
                          phone_number: "",
                        }));
                      }
                    }}
                    placeholder="e.g. 9812345678"
                    placeholderTextColor="#79726b"
                    keyboardType="phone-pad"
                    className={`h-11 rounded-xl border bg-surface pl-10 pr-3 text-sm text-ink ${
                      formErrors.phone_number
                        ? "border-red-500"
                        : "border-border"
                    }`}
                  />
                </View>
                {Boolean(formErrors.phone_number) && (
                  <Text className="mt-1 text-xs text-red-500">
                    {formErrors.phone_number}
                  </Text>
                )}
              </View>

              {/* Address Input */}
              <View className="mb-6">
                <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Address *
                </Text>
                <View className="relative">
                  <TextInput
                    value={address}
                    onChangeText={(val) => {
                      setAddress(val);
                      if (formErrors.address) {
                        setFormErrors((prev) => ({ ...prev, address: "" }));
                      }
                    }}
                    placeholder="e.g. Ward 4, New Road, Kathmandu"
                    placeholderTextColor="#79726b"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    className={`min-h-[80px] rounded-xl border bg-surface p-3 text-sm text-ink ${
                      formErrors.address ? "border-red-500" : "border-border"
                    }`}
                  />
                </View>
                {Boolean(formErrors.address) && (
                  <Text className="mt-1 text-xs text-red-500">
                    {formErrors.address}
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-3 pb-6">
                <Pressable
                  onPress={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 h-12 items-center justify-center rounded-xl border border-border bg-surface active:opacity-70"
                >
                  <Text className="text-sm font-semibold text-ink">Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleSubmitForm}
                  disabled={isSubmitting}
                  className="flex-1 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">
                      {editingCustomer ? "Update" : "Create"}
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
