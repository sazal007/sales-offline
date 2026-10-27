// src/hooks/useAuthMutations.ts

import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import {
  loginAndFetchProfile,
  forgotPasswordRequest,
} from "@/services/auth.service";

import type { LoginCredentials, ForgotPasswordPayload } from "@/types/auth";

// ─────────────────────────────────────────────────────────────
// useLoginMutation
// ─────────────────────────────────────────────────────────────

/**
 * Handles the full login flow:
 *  1. POST /api/account/login/ to get tokens
 *  2. Stores tokens in SecureStore
 *  3. GET /api/account/profile/ for user data
 *  4. Updates AuthContext state
 *  5. Navigates to /(tabs)
 *
 * Usage:
 *   const { mutate, isPending, isError, error } = useLoginMutation();
 *   mutate({ phone_number, password });
 */
export function useLoginMutation() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      loginAndFetchProfile(credentials),

    onSuccess: async ({ accessToken, refreshToken, user }) => {
      // Update the in-memory auth context
      await login(accessToken, refreshToken, user);
      // Navigate into the app
      router.replace("/(tabs)");
    },

    // Errors bubble up via mutation.error — the api-client interceptor
    // already normalises the message, so callers can use error.message directly.
  });
}

// ─────────────────────────────────────────────────────────────
// useForgotPasswordMutation
// ─────────────────────────────────────────────────────────────

/**
 * Calls POST /api/account/forget-password/ to reset the user's password.
 *
 * Usage:
 *   const { mutate, isPending, isError, isSuccess, error } =
 *     useForgotPasswordMutation();
 *   mutate({ phone_number, new_password });
 */
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) =>
      forgotPasswordRequest(payload),
  });
}
