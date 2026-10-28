// src/hooks/useOfflineOrderQueries.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOfflineOrders,
  getOfflineOrderDetail,
  createOfflineOrder,
  updateOfflineOrder,
  cancelOfflineOrder,
  getFranchiseInventory,
  getProducts,
} from "@/services/order.service";
import type {
  CreateOfflineOrderPayload,
  UpdateOfflineOrderPayload,
  OfflineOrderDetailResponse,
} from "@/types/offlineSales";

export const OFFLINE_ORDERS_KEY = ["offlineOrders"] as const;
export const FRANCHISE_INVENTORY_KEY = ["franchiseInventory"] as const;

/**
 * Fetch all offline sales orders.
 */
export function useOfflineOrdersQuery() {
  return useQuery({
    queryKey: OFFLINE_ORDERS_KEY,
    queryFn: getOfflineOrders,
  });
}

/**
 * Fetch order detail by code.
 */
export function useOfflineOrderDetailQuery(orderCode?: string) {
  return useQuery({
    queryKey: [...OFFLINE_ORDERS_KEY, orderCode],
    queryFn: () => getOfflineOrderDetail(orderCode!),
    enabled: Boolean(orderCode),
  });
}

/**
 * Create offline order mutation.
 */
export function useCreateOfflineOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    OfflineOrderDetailResponse,
    Error,
    CreateOfflineOrderPayload
  >({
    mutationFn: (payload) => createOfflineOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: OFFLINE_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (data?.customer) {
        queryClient.invalidateQueries({
          queryKey: ["customerOrders", data.customer],
        });
      }
    },
  });
}

/**
 * Update offline order mutation.
 */
export function useUpdateOfflineOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    OfflineOrderDetailResponse,
    Error,
    { orderCode: string; payload: UpdateOfflineOrderPayload }
  >({
    mutationFn: ({ orderCode, payload }) =>
      updateOfflineOrder(orderCode, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: OFFLINE_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FRANCHISE_INVENTORY_KEY });
      if (data?.order_code) {
        queryClient.invalidateQueries({
          queryKey: [...OFFLINE_ORDERS_KEY, data.order_code],
        });
      }
    },
  });
}

/**
 * Cancel offline order mutation.
 */
export function useCancelOfflineOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderCode: string) => cancelOfflineOrder(orderCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFLINE_ORDERS_KEY });
    },
  });
}

/**
 * Fetch franchise inventory for item selection.
 */
export function useFranchiseInventoryQuery() {
  return useQuery({
    queryKey: FRANCHISE_INVENTORY_KEY,
    queryFn: getFranchiseInventory,
  });
}

export const PRODUCTS_QUERY_KEY = ["salesProducts"] as const;

/**
 * Fetch products from /api/sales/products/
 */
export function useProductsQuery() {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: getProducts,
  });
}
