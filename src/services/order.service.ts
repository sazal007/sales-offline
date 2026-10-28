// src/services/order.service.ts

import apiClient from "@/lib/api-client";
import * as SecureStore from "expo-secure-store";
import type {
  CreateOfflineOrderPayload,
  UpdateOfflineOrderPayload,
  OfflineOrderDetailResponse,
  PaginatedOfflineOrdersResponse,
  FranchiseInventoryItem,
  Product,
} from "@/types/offlineSales";

const ORDERS_ENDPOINT = "/api/offline-sales/orders/";
const INVENTORY_ENDPOINT = "/api/sales/franchise-inventory/";

async function getAuthHeader() {
  const token = await SecureStore.getItemAsync("cem_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetch all offline sales orders.
 * Handles both plain array and DRF paginated { results: [...] } formats.
 */
export async function getOfflineOrders(): Promise<OfflineOrderDetailResponse[]> {
  const headers = await getAuthHeader();
  const response = await apiClient.get<
    OfflineOrderDetailResponse[] | PaginatedOfflineOrdersResponse
  >(ORDERS_ENDPOINT, { headers });

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }

  return [];
}

/**
 * Fetch a single order by order code.
 */
export async function getOfflineOrderDetail(
  orderCode: string,
): Promise<OfflineOrderDetailResponse> {
  const headers = await getAuthHeader();
  const response = await apiClient.get<OfflineOrderDetailResponse>(
    `${ORDERS_ENDPOINT}${orderCode}/`,
    { headers },
  );
  return response.data;
}

/**
 * Create a new offline order.
 * Handles both JSON payload and multipart/form-data if a screenshot is provided.
 */
export async function createOfflineOrder(
  payload: CreateOfflineOrderPayload,
): Promise<OfflineOrderDetailResponse> {
  const headers = await getAuthHeader();

  // If a screenshot file/blob is present, send as multipart/form-data
  if (payload.payment_screenshot) {
    const formData = new FormData();
    formData.append("customer", String(payload.customer));
    formData.append("total_amount", String(payload.total_amount));

    if (payload.paid_amount !== undefined) {
      formData.append("paid_amount", String(payload.paid_amount));
    }
    if (payload.payment_method) {
      formData.append("payment_method", payload.payment_method);
    }
    if (payload.order_date) {
      formData.append("order_date", payload.order_date);
    }
    if (payload.remarks) {
      formData.append("remarks", payload.remarks);
    }

    // Send items as indexed fields so DRF multipart parser reads them correctly
    payload.items.forEach((item, i) => {
      formData.append(`items[${i}]inventory_id`, String(item.inventory_id));
      formData.append(`items[${i}]quantity`, String(item.quantity));
    });
    formData.append("payment_screenshot", {
      uri: payload.payment_screenshot.uri,
      name: payload.payment_screenshot.name || "receipt.jpg",
      type: payload.payment_screenshot.type || "image/jpeg",
    } as any);

    // IMPORTANT: Do NOT set Content-Type manually.
    // React Native FormData needs to auto-generate the boundary in Content-Type.
    // Setting it manually without a boundary breaks multipart parsing on the server.
    const response = await apiClient.post<OfflineOrderDetailResponse>(
      ORDERS_ENDPOINT,
      formData,
      {
        headers: {
          ...headers,
          "Content-Type": undefined as any,
        },
        transformRequest: (data: any) => data, // prevent Axios from JSON-stringifying FormData
      },
    );
    return response.data;
  }

  // Standard JSON submission
  const response = await apiClient.post<OfflineOrderDetailResponse>(
    ORDERS_ENDPOINT,
    payload,
    { headers },
  );
  return response.data;
}

/**
 * Update an offline order (amount, paid amount, remarks, order_date, screenshot, etc.).
 */
export async function updateOfflineOrder(
  orderCode: string,
  payload: UpdateOfflineOrderPayload,
): Promise<OfflineOrderDetailResponse> {
  const headers = await getAuthHeader();

  if (payload.payment_screenshot) {
    const formData = new FormData();
    if (payload.total_amount !== undefined) {
      formData.append("total_amount", String(payload.total_amount));
    }
    if (payload.paid_amount !== undefined) {
      formData.append("paid_amount", String(payload.paid_amount));
    }
    if (payload.payment_method) {
      formData.append("payment_method", payload.payment_method);
    }
    if (payload.order_date) {
      formData.append("order_date", payload.order_date);
    }
    if (payload.remarks !== undefined) {
      formData.append("remarks", payload.remarks || "");
    }
    if (payload.items && payload.items.length > 0) {
      payload.items.forEach((item, i) => {
        formData.append(`items[${i}]inventory_id`, String(item.inventory_id));
        formData.append(`items[${i}]quantity`, String(item.quantity));
      });
    }
    formData.append("payment_screenshot", {
      uri: payload.payment_screenshot.uri,
      name: payload.payment_screenshot.name || "receipt.jpg",
      type: payload.payment_screenshot.type || "image/jpeg",
    } as any);

    const response = await apiClient.patch<OfflineOrderDetailResponse>(
      `${ORDERS_ENDPOINT}${orderCode}/`,
      formData,
      {
        headers: {
          ...headers,
          "Content-Type": undefined as any,
        },
        transformRequest: (data: any) => data,
      },
    );
    return response.data;
  }

  const response = await apiClient.patch<OfflineOrderDetailResponse>(
    `${ORDERS_ENDPOINT}${orderCode}/`,
    payload,
    { headers },
  );
  return response.data;
}

/**
 * Cancel an offline order by order code.
 */
export async function cancelOfflineOrder(
  orderCode: string,
): Promise<{ message?: string }> {
  const headers = await getAuthHeader();
  const response = await apiClient.post<{ message?: string }>(
    `${ORDERS_ENDPOINT}${orderCode}/cancel/`,
    {},
    { headers },
  );
  return response.data;
}

/**
 * Fetch franchise inventory items to select for orders.
 */
export async function getFranchiseInventory(): Promise<FranchiseInventoryItem[]> {
  try {
    const headers = await getAuthHeader();
    const response = await apiClient.get<
      FranchiseInventoryItem[] | { results: FranchiseInventoryItem[] }
    >(INVENTORY_ENDPOINT, { headers });

    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  } catch (error) {
    console.warn("Failed to fetch franchise inventory:", error);
    return [];
  }
}

const PRODUCTS_ENDPOINT = "/api/sales/products/";

/**
 * Fetch products from /api/sales/products/
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const headers = await getAuthHeader();
    const response = await apiClient.get<
      Product[] | { results: Product[] }
    >(PRODUCTS_ENDPOINT, { headers });

    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray((response.data as any).results)) {
      return (response.data as any).results;
    }
    return [];
  } catch (error) {
    console.warn("Failed to fetch products:", error);
    return [];
  }
}
