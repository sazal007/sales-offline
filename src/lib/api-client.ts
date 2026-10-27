import axios from "axios";
import * as SecureStore from "expo-secure-store";

export function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  if (!error) return fallback;

  if (typeof error === "string") {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data) {
      if (typeof data === "string") {
        return data;
      }

      // 1. DRF non-field errors
      if (data.non_field_errors) {
        if (
          Array.isArray(data.non_field_errors) &&
          data.non_field_errors.length > 0
        ) {
          return data.non_field_errors.join(" ");
        }

        if (typeof data.non_field_errors === "string") {
          return data.non_field_errors;
        }
      }

      // 2. DRF detail
      if (data.detail) {
        if (typeof data.detail === "string") {
          return data.detail;
        }

        if (Array.isArray(data.detail) && data.detail.length > 0) {
          return data.detail.join(" ");
        }
      }

      // 3. error/message
      if (typeof data.error === "string") {
        return data.error;
      }

      if (typeof data.message === "string") {
        return data.message;
      }

      // 4. Field errors
      if (typeof data === "object") {
        const messages: string[] = [];

        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value) && value.length > 0) {
            const fieldLabel =
              key !== "non_field_errors" ? `${key.replace(/_/g, " ")}: ` : "";

            messages.push(`${fieldLabel}${value.join(" ")}`);
          } else if (typeof value === "string") {
            const fieldLabel =
              key !== "non_field_errors" ? `${key.replace(/_/g, " ")}: ` : "";

            messages.push(`${fieldLabel}${value}`);
          }
        }

        if (messages.length > 0) {
          return messages.join(" | ");
        }
      }
    }

    // Don't show "Request failed with status code 401"
    // when there is no useful backend message.
    if (
      error.message &&
      !error.message.startsWith("Request failed with status code")
    ) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// -----------------------------------------------------------------------------
// Shared Axios instance
// -----------------------------------------------------------------------------

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const apiClient = axios.create({
  baseURL: baseURL.replace(/\/+$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
});

// -----------------------------------------------------------------------------
// Request interceptor
// -----------------------------------------------------------------------------

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("cem_access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// -----------------------------------------------------------------------------
// Response interceptor
// -----------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response) => response,

  (error) => {
    const customMessage = getApiErrorMessage(error);

    if (axios.isAxiosError(error)) {
      error.message = customMessage;
    }

    return Promise.reject(error);
  },
);

export default apiClient;
