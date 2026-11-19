// src/components/customers/CustomerFormModal.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  X,
  Store,
  User,
  Phone,
  MapPin,
  AlertCircle,
} from "lucide-react-native";
import type { OfflineCustomer } from "@/types/customer";
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from "@/hooks/useCustomerQueries";

interface CustomerFormModalProps {
  visible: boolean;
  editingCustomer: OfflineCustomer | null;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function CustomerFormModal({
  visible,
  editingCustomer,
  onClose,
}: CustomerFormModalProps) {
  const [rendered, setRendered] = useState(visible);
  const isClosingRef = useRef(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      setRendered(false);
      onClose();
    });
  };

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setRendered(true);
      backdropAnim.setValue(0);
      sheetAnim.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered && !isClosingRef.current) {
      isClosingRef.current = true;
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        isClosingRef.current = false;
        setRendered(false);
      });
    }
  }, [visible]);

  const [storeName, setStoreName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const createMutation = useCreateCustomerMutation();
  const updateMutation = useUpdateCustomerMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (visible) {
      if (editingCustomer) {
        setStoreName(editingCustomer.store_name || "");
        setContactPerson(editingCustomer.contact_person || "");
        setPhoneNumber(editingCustomer.phone_number || "");
        setAddress(editingCustomer.address || "");
      } else {
        setStoreName("");
        setContactPerson("");
        setPhoneNumber("");
        setAddress("");
      }
      setFormErrors({});
      setApiError(null);
    }
  }, [visible, editingCustomer]);

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

  const handleSubmit = async () => {
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
      handleClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save customer. Please try again.";
      setApiError(msg);
    }
  };

  return (
    <Modal
      visible={rendered}
      animationType="none"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
      >
        <Animated.View
          style={{ opacity: backdropAnim }}
          className="absolute inset-0 bg-black/50"
          pointerEvents="none"
        />
        <Pressable className="flex-1" onPress={handleClose} />
        <Animated.View
          style={{ transform: [{ translateY: sheetAnim }] }}
          className="max-h-[88%] rounded-t-3xl border-t border-border bg-background pb-8 pt-5"
        >
          {/* Modal Header */}
          <View className="flex-row items-center justify-between border-b border-border px-6 pb-4">
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
              onPress={handleClose}
              className="h-8 w-8 items-center justify-center rounded-full bg-white border border-border"
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

            {/* Store Name Input */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Store Name *
              </Text>
              <View className="relative justify-center">
                <Store
                  size={16}
                  color="#79726b"
                  style={{ position: "absolute", left: 14, zIndex: 1 }}
                />
                <TextInput
                  value={storeName}
                  onChangeText={(val) => {
                    setStoreName(val);
                    if (formErrors.store_name) {
                      setFormErrors((prev) => ({ ...prev, store_name: "" }));
                    }
                  }}
                  placeholder="e.g. Kathmandu Kirana Pasal"
                  placeholderTextColor="#79726b"
                  className={`h-12 rounded-xl border bg-white pl-11 pr-4 text-sm text-ink ${
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
                  style={{ position: "absolute", left: 14, zIndex: 1 }}
                />
                <TextInput
                  value={contactPerson}
                  onChangeText={(val) => {
                    setContactPerson(val);
                    if (formErrors.contact_person) {
                      setFormErrors((prev) => ({ ...prev, contact_person: "" }));
                    }
                  }}
                  placeholder="e.g. Ram Bahadur Shrestha"
                  placeholderTextColor="#79726b"
                  className={`h-12 rounded-xl border bg-white pl-11 pr-4 text-sm text-ink ${
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
                  style={{ position: "absolute", left: 14, zIndex: 1 }}
                />
                <TextInput
                  value={phoneNumber}
                  onChangeText={(val) => {
                    setPhoneNumber(val);
                    if (formErrors.phone_number) {
                      setFormErrors((prev) => ({ ...prev, phone_number: "" }));
                    }
                  }}
                  placeholder="e.g. 9841234567"
                  placeholderTextColor="#79726b"
                  keyboardType="phone-pad"
                  className={`h-12 rounded-xl border bg-white pl-11 pr-4 text-sm text-ink ${
                    formErrors.phone_number ? "border-red-500" : "border-border"
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
              <View className="relative justify-center">
                <MapPin
                  size={16}
                  color="#79726b"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 15,
                    zIndex: 1,
                  }}
                />
                <TextInput
                  value={address}
                  onChangeText={(val) => {
                    setAddress(val);
                    if (formErrors.address) {
                      setFormErrors((prev) => ({ ...prev, address: "" }));
                    }
                  }}
                  placeholder="e.g. New Road, Ward 22, Kathmandu"
                  placeholderTextColor="#79726b"
                  multiline
                  numberOfLines={3}
                  className={`min-h-[80px] rounded-xl border bg-white pb-3 pl-11 pr-4 pt-3.5 text-sm text-ink ${
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
                onPress={handleClose}
                disabled={isSubmitting}
                className="h-12 flex-1 items-center justify-center rounded-xl border border-border bg-white active:opacity-70"
              >
                <Text className="text-sm font-semibold text-ink">Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand active:opacity-80"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    {editingCustomer ? "Save Changes" : "Create Customer"}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
