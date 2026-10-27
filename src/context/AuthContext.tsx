// src/context/AuthContext.tsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";

import * as SecureStore from "expo-secure-store";
import apiClient from "@/lib/api-client";

import type { UserProfile, UserRole } from "@/types/auth";

// ─────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────

const ACCESS_KEY = "cem_access_token";
const REFRESH_KEY = "cem_refresh_token";
const USER_KEY = "cem_user_profile";

// ─────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────

interface AuthCtx {
  user: UserProfile | null;

  accessToken: string | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  role: UserRole | null;

  hasRole: (allowedRoles: UserRole | UserRole[]) => boolean;

  login: (
    accessToken: string,
    refreshToken: string,
    user: UserProfile,
  ) => Promise<void>;

  logout: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthCtx | null>(null);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // ─────────────────────────────────────────────────────────
  // Restore session
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await SecureStore.getItemAsync(ACCESS_KEY);

        if (!storedToken) {
          // No token at all — not logged in.
          return;
        }

        // Verify the token is still valid by hitting the profile endpoint.
        // The request interceptor in api-client will attach the Bearer header
        // from SecureStore automatically.
        const response = await apiClient.get<UserProfile>("/api/account/profile/");
        const profile = response.data;

        // Token is good — restore session.
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));
        setAccessToken(storedToken);
        setUser(profile);
      } catch (error) {
        // Token is expired / invalid → wipe storage so the guard redirects.
        console.warn("Session restore failed, clearing auth:", error);
        await SecureStore.deleteItemAsync(ACCESS_KEY);
        await SecureStore.deleteItemAsync(REFRESH_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // ─────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────

  const login = useCallback(
    async (access: string, refresh: string, profile: UserProfile) => {
      await SecureStore.setItemAsync(ACCESS_KEY, access);

      await SecureStore.setItemAsync(REFRESH_KEY, refresh);

      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(profile));

      setAccessToken(access);
      setUser(profile);
    },
    [],
  );

  // ─────────────────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY);

    await SecureStore.deleteItemAsync(REFRESH_KEY);

    await SecureStore.deleteItemAsync(USER_KEY);

    setAccessToken(null);
    setUser(null);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Role check
  // ─────────────────────────────────────────────────────────

  const hasRole = useCallback(
    (allowedRoles: UserRole | UserRole[]) => {
      if (!user?.role) {
        return false;
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      return roles.includes(user.role);
    },
    [user],
  );

  // ─────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────

  const value = useMemo<AuthCtx>(
    () => ({
      user,

      accessToken,

      isAuthenticated: !!accessToken && !!user,

      isLoading,

      role: user?.role ?? null,

      hasRole,

      login,

      logout,
    }),
    [user, accessToken, isLoading, hasRole, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return context;
}
