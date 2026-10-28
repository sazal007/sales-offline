// src/hooks/useOfflineOrderQueries.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOfflineOrders,
  getCustomerOrders,
  getOfflineOrderDetail,
  createOfflineOrder,
  updateOfflineOrder,
  cancelOfflineOrder,
  getFranchiseInventory,
  getProducts,
  getOfflineSalesStats,
  recordOfflinePayment,
} from "@/services/order.service";
import type {
  CreateOfflineOrderPayload,
  UpdateOfflineOrderPayload,
  OfflineOrderDetailResponse,
  RecordOfflinePaymentPayload,
  OfflinePaymentResponse,
} from "@/types/offlineSales";

export const OFFLINE_ORDERS_KEY = ["offlineOrders"] as const;
export const FRANCHISE_INVENTORY_KEY = ["franchiseInventory"] as const;
export const CUSTOMER_ORDERS_KEY = ["customerOrders"] as const;

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
 * Fetch orders for a specific customer.
 * Endpoint: /api/offline-sales/orders/?customer={customerId}
 */
export function useCustomerOrdersQuery(
  customerId: number | string | undefined | null,
) {
  return useQuery({
    queryKey: [
      ...CUSTOMER_ORDERS_KEY,
      customerId ? String(customerId) : null,
    ],
    queryFn: () => {
      if (!customerId) throw new Error("Customer ID is required");
      return getCustomerOrders(customerId);
    },
    enabled: Boolean(customerId),
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

export const OFFLINE_SALES_STATS_KEY = ["offlineSalesStats"] as const;

/**
 * Fetch offline sales stats from /api/offline-sales/stats/
 */
export function useOfflineSalesStatsQuery() {
  return useQuery({
    queryKey: OFFLINE_SALES_STATS_KEY,
    queryFn: getOfflineSalesStats,
  });
}

/**
 * Record an offline payment mutation.
 * Endpoint: POST /api/offline-sales/payments/
 * Invalidates orders, customers, stats, and customer orders on success.
 */
export function useRecordOfflinePaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    OfflinePaymentResponse,
    Error,
    RecordOfflinePaymentPayload
  >({
    mutationFn: recordOfflinePayment,
    onSuccess: (data) => {
      // Refresh all related lists
      queryClient.invalidateQueries({ queryKey: OFFLINE_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: OFFLINE_SALES_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_ORDERS_KEY });
      // Refresh the specific order detail
      if (data.order_code) {
        queryClient.invalidateQueries({
          queryKey: [...OFFLINE_ORDERS_KEY, data.order_code],
        });
      }
      // Refresh the specific customer's data
      if (data.customer) {
        queryClient.invalidateQueries({
          queryKey: ["customerDetail", String(data.customer)],
        });
        queryClient.invalidateQueries({
          queryKey: [...CUSTOMER_ORDERS_KEY, String(data.customer)],
        });
      }
    },
  });
}
