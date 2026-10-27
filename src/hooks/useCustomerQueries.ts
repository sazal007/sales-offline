// src/hooks/useCustomerQueries.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/services/customer.service";
import type {
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from "@/types/customer";

export const CUSTOMERS_QUERY_KEY = ["customers"] as const;

/**
 * Fetch all customers.
 */
export function useCustomersQuery() {
  return useQuery({
    queryKey: CUSTOMERS_QUERY_KEY,
    queryFn: getCustomers,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
    },
  });
}
