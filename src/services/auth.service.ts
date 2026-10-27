// src/services/auth.service.ts

import apiClient from "@/lib/api-client";
import * as SecureStore from "expo-secure-store";

import type {
  LoginCredentials,
  LoginResponse,
  UserProfile,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
} from "@/types/auth";

// ─────────────────────────────────────────────────────────────
// Storage Keys (must match AuthContext)
// ─────────────────────────────────────────────────────────────

const ACCESS_KEY = "cem_access_token";
const REFRESH_KEY = "cem_refresh_token";
const USER_KEY = "cem_user_profile";

// ─────────────────────────────────────────────────────────────
// API Calls
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/account/login/
 * Returns access + refresh tokens.
 */
export async function loginRequest(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    "/api/account/login/",
    credentials,
  );
  return response.data;
}

/**
 * GET /api/account/profile/
 * Returns the authenticated user's profile.
 */
export async function fetchProfile(): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>("/api/account/profile/");
  return response.data;
}

/**
 * POST /api/account/forget-password/
 * Resets the user's password without OTP.
 */
export async function forgotPasswordRequest(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  const response = await apiClient.post<ForgotPasswordResponse>(
    "/api/account/forget-password/",
    payload,
  );
  return response.data;
}

// ─────────────────────────────────────────────────────────────
// Composite: login → store tokens → fetch profile
// ─────────────────────────────────────────────────────────────

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export async function loginAndFetchProfile(
  credentials: LoginCredentials,
): Promise<LoginResult> {
  // 1. Authenticate
  const { access, refresh } = await loginRequest(credentials);

  // 2. Persist tokens so the interceptor picks them up immediately
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);

  // 3. Fetch profile (the request interceptor will add the Bearer header)
  const user = await fetchProfile();

  // 4. Persist user profile
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

  return { accessToken: access, refreshToken: refresh, user };
}
