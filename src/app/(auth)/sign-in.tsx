// src/app/(auth)/sign-in.tsx

import { Eye, EyeOff, Lock, Phone } from "lucide-react-native";

import { useState } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  useLoginMutation,
  useForgotPasswordMutation,
} from "@/hooks/useAuthMutations";

// ─────────────────────────────────────────────────────────────
// Forgot Password Modal
// ─────────────────────────────────────────────────────────────

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

function ForgotPasswordModal({ visible, onClose }: ForgotPasswordModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    phone_number: "",
    new_password: "",
    confirm_password: "",
  });

  const forgotMutation = useForgotPasswordMutation();

  const resetForm = () => {
    setPhoneNumber("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNew(false);
    setShowConfirm(false);
    setFieldErrors({ phone_number: "", new_password: "", confirm_password: "" });
    forgotMutation.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    // Validate
    const errors = { phone_number: "", new_password: "", confirm_password: "" };
    let hasError = false;

    if (!phoneNumber.trim()) {
      errors.phone_number = "Phone number is required.";
      hasError = true;
    }

    if (!newPassword.trim()) {
      errors.new_password = "New password is required.";
      hasError = true;
    }

    if (!confirmPassword.trim()) {
      errors.confirm_password = "Confirm password is required.";
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      errors.confirm_password = "Passwords do not match.";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({ phone_number: "", new_password: "", confirm_password: "" });

    forgotMutation.mutate(
      { phone_number: phoneNumber.trim(), new_password: newPassword },
      { onSuccess: handleClose },
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={handleClose}
      >
        {/* Prevent inner taps from closing */}
        <Pressable onPress={() => {}}>
          <View className="rounded-t-3xl bg-surface px-6 pb-10 pt-6">
            {/* Drag handle */}
            <View className="mb-6 h-1 w-10 self-center rounded-full bg-border" />

            <Text className="mb-1 text-xl font-bold text-ink">
              Reset Password
            </Text>
            <Text className="mb-6 text-sm text-ink-soft">
              Enter your phone number and choose a new password.
            </Text>

            {/* Phone */}
            <View className="mb-4 gap-1.5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Phone Number
              </Text>
              <View className="relative justify-center">
                <Phone
                  size={16}
                  color="#79726b"
                  style={{ position: "absolute", left: 14, zIndex: 1 }}
                />
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#79726b"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  editable={!forgotMutation.isPending}
                  className={`h-12 rounded-xl border bg-background pl-10 pr-4 text-sm text-ink ${
                    fieldErrors.phone_number ? "border-red-500" : "border-border"
                  }`}
                />
              </View>
              {fieldErrors.phone_number ? (
                <Text className="text-xs text-red-500">
                  {fieldErrors.phone_number}
                </Text>
              ) : null}
            </View>

            {/* New Password */}
            <View className="mb-4 gap-1.5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                New Password
              </Text>
              <View className="relative justify-center">
                <Lock
                  size={16}
                  color="#79726b"
                  style={{ position: "absolute", left: 14, zIndex: 1 }}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#79726b"
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  editable={!forgotMutation.isPending}
                  className={`h-12 rounded-xl border bg-background pl-10 pr-10 text-sm text-ink ${
                    fieldErrors.new_password ? "border-red-500" : "border-border"
                  }`}
                />
                <Pressable
                  onPress={() => setShowNew((v) => !v)}
                  hitSlop={8}
                  style={{ position: "absolute", right: 12, zIndex: 1 }}
                >
                  {showNew ? (
                    <EyeOff size={16} color="#79726b" />
                  ) : (
                    <Eye size={16} color="#79726b" />
                  )}
                </Pressable>
              </View>
              {fieldErrors.new_password ? (
                <Text className="text-xs text-red-500">
                  {fieldErrors.new_password}
                </Text>
              ) : null}
            </View>

            {/* Confirm Password */}
            <View className="mb-6 gap-1.5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Confirm Password
              </Text>
              <View className="relative justify-center">
                <Lock
                  size={16}
                  color="#79726b"
                  style={{ position: "absolute", left: 14, zIndex: 1 }}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#79726b"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  editable={!forgotMutation.isPending}
                  className={`h-12 rounded-xl border bg-background pl-10 pr-10 text-sm text-ink ${
                    fieldErrors.confirm_password
                      ? "border-red-500"
                      : "border-border"
                  }`}
                />
                <Pressable
                  onPress={() => setShowConfirm((v) => !v)}
                  hitSlop={8}
                  style={{ position: "absolute", right: 12, zIndex: 1 }}
                >
                  {showConfirm ? (
                    <EyeOff size={16} color="#79726b" />
                  ) : (
                    <Eye size={16} color="#79726b" />
                  )}
                </Pressable>
              </View>
              {fieldErrors.confirm_password ? (
                <Text className="text-xs text-red-500">
                  {fieldErrors.confirm_password}
                </Text>
              ) : null}
            </View>

            {/* API error */}
            {forgotMutation.isError ? (
              <Text className="mb-4 text-sm text-red-600">
                {forgotMutation.error.message}
              </Text>
            ) : null}

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={forgotMutation.isPending}
              className="h-12 items-center justify-center rounded-xl bg-brand"
            >
              {forgotMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm font-bold tracking-wide text-white">
                  Reset Password
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Sign In Screen
// ─────────────────────────────────────────────────────────────

export default function SignInScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const loginMutation = useLoginMutation();

  const handleSignIn = () => {
    if (!phoneNumber.trim() || !password.trim()) return;

    loginMutation.mutate({
      phone_number: phoneNumber.trim(),
      password,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-1 px-6 pt-10 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-ink">Welcome back</Text>
            <Text className="mt-1.5 text-sm text-ink-soft">
              Sign in to continue to Yachu Sales
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Phone Number */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Phone Number
              </Text>
              <View className="relative justify-center">
                <Phone
                  size={16}
                  color="#79726b"
                  style={{ position: "absolute", left: 14, zIndex: 1 }}
                />
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#79726b"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  editable={!loginMutation.isPending}
                  className="h-12 rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-ink"
                />
              </View>
            </View>

            {/* Password */}
            <View className="gap-1.5">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Password
              </Text>
              <View className="relative justify-center">
                <Lock
                  size={16}
                  color="#79726b"
                  style={{ position: "absolute", left: 14, zIndex: 1 }}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#79726b"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                  editable={!loginMutation.isPending}
                  className="h-12 rounded-xl border border-border bg-surface pl-10 pr-10 text-sm text-ink"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  disabled={loginMutation.isPending}
                  hitSlop={8}
                  style={{ position: "absolute", right: 12, zIndex: 1 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color="#79726b" />
                  ) : (
                    <Eye size={16} color="#79726b" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Forgot password */}
            <Pressable
              onPress={() => setShowForgot(true)}
              disabled={loginMutation.isPending}
              className="self-end"
            >
              <Text className="text-xs font-semibold text-brand">
                Forgot password?
              </Text>
            </Pressable>

            {/* API Error */}
            {loginMutation.isError ? (
              <Text className="text-sm text-red-600">
                {loginMutation.error.message}
              </Text>
            ) : null}

            {/* Sign In Button */}
            <Pressable
              onPress={handleSignIn}
              disabled={loginMutation.isPending}
              className="mt-1 h-12 items-center justify-center rounded-xl bg-brand shadow-sm"
            >
              {loginMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm font-bold tracking-wide text-white">
                  Sign In
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgot}
        onClose={() => setShowForgot(false)}
      />
    </SafeAreaView>
  );
}
