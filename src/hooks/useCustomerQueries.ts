// src/hooks/useCustomerQueries.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCustomers,
  getCustomerDetail,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/services/customer.service";
import type {
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from "@/types/customer";

export const CUSTOMERS_QUERY_KEY = ["customers"] as const;
export const CUSTOMER_DETAIL_QUERY_KEY = ["customer-detail"] as const;

/**
 * Fetch a single customer detail by ID.
 */
export function useCustomerDetailQuery(id: number | string | undefined | null) {
  return useQuery({
    queryKey: [...CUSTOMER_DETAIL_QUERY_KEY, id ? String(id) : null],
    queryFn: () => {
      if (!id) throw new Error("Customer ID is required");
      return getCustomerDetail(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Fetch all customers, optionally filtered by server-side search query (?search=).
 */
export function useCustomersQuery(search?: string) {
  const trimmed = search?.trim();
  return useQuery({
    queryKey: trimmed
      ? [...CUSTOMERS_QUERY_KEY, { search: trimmed }]
      : CUSTOMERS_QUERY_KEY,
    queryFn: () => getCustomers(trimmed),
  });
}

/**
 * Create a new customer mutation.
 */
export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
    },
  });
}

/**
 * Update an existing customer mutation.
 */
export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number | string;
      payload: UpdateCustomerPayload;
    }) => updateCustomer(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...CUSTOMER_DETAIL_QUERY_KEY, String(variables.id)],
      });
    },
  });
}

/**
 * Delete a customer mutation.
 */
export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => deleteCustomer(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...CUSTOMER_DETAIL_QUERY_KEY, String(id)],
      });
    },
  });
}
