import { Redirect, Slot } from "expo-router";

import { ActivityIndicator, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait until SecureStore has been checked.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#e8452c" />
      </View>
    );
  }

  // Already logged in.
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Slot />;
}
