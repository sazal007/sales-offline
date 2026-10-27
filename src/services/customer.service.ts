// src/services/customer.service.ts

import apiClient from "@/lib/api-client";
import * as SecureStore from "expo-secure-store";
import type {
  OfflineCustomer,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  PaginatedCustomersResponse,
} from "@/types/customer";

const CUSTOMERS_ENDPOINT = "/api/offline-sales/customers/";

async function getAuthHeader() {
  const token = await SecureStore.getItemAsync("cem_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch all offline customers.
 * Optionally filters by search query via ?search= query parameter.
 * Handles both plain array and DRF paginated response formats.
 */
export async function getCustomers(search?: string): Promise<OfflineCustomer[]> {
  const headers = await getAuthHeader();
  const trimmed = search?.trim();
  const params = trimmed ? { search: trimmed } : undefined;
  const response = await apiClient.get<
    OfflineCustomer[] | PaginatedCustomersResponse
  >(CUSTOMERS_ENDPOINT, { headers, params });

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }

  return [];
}

/**
 * Create a new offline customer.
 */
export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<OfflineCustomer> {
  const headers = await getAuthHeader();
  const response = await apiClient.post<OfflineCustomer>(
    CUSTOMERS_ENDPOINT,
    payload,
    { headers },
  );
  return response.data;
}

/**
 * Update an existing customer by ID.
 */
export async function updateCustomer(
  id: number | string,
  payload: UpdateCustomerPayload,
): Promise<OfflineCustomer> {
  const headers = await getAuthHeader();
  const response = await apiClient.patch<OfflineCustomer>(
    `${CUSTOMERS_ENDPOINT}${id}/`,
    payload,
    { headers },
  );
  return response.data;
}

/**
 * Delete a customer by ID.
 */
export async function deleteCustomer(id: number | string): Promise<void> {
  const headers = await getAuthHeader();
  await apiClient.delete(`${CUSTOMERS_ENDPOINT}${id}/`, { headers });
}
