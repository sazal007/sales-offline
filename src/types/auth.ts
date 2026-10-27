// src/types/auth.ts

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────

export type UserRole =
  | "SalesPerson"
  | "Offline_SalesPerson"
  | "Distributor"
  | "SuperAdmin"
  | "Other"
  | "Franchise"
  | "Factory"
  | "Treatment Staff"
  | "Logistic"
  | "Packaging";

// ─────────────────────────────────────────────────────────────
// User Profile
// ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  role: UserRole;
  is_active: boolean;
  distributor: string;
  franchise_id: number;
  distributor_name?: string;
  franchise_name?: string;
  factory_name?: string;
}

// ─────────────────────────────────────────────────────────────
// Auth API shapes
// ─────────────────────────────────────────────────────────────

export interface LoginCredentials {
  phone_number: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export type LoginResponse = AuthTokens;

export interface ForgotPasswordPayload {
  phone_number: string;
  new_password: string;
}

export interface ForgotPasswordResponse {
  message?: string;
}
