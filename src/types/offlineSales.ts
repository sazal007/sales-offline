// src/types/offlineSales.ts

export type OfflinePaymentMethod =
  | "cash"
  | "online"
  | "cheque"
  | "bank_transfer";

export type OfflineOrderStatus =
  | "Pending"
  | "Confirmed"
  | "Delivered"
  | "Cancelled";

export type OfflinePaymentStatus = "Unpaid" | "Partial" | "Paid";

export interface CreateOrderItemInput {
  inventory_id: number;
  quantity: number;
}

export interface CreateOfflineOrderPayload {
  customer: number;
  total_amount: string | number;
  paid_amount?: string | number;
  payment_method?: OfflinePaymentMethod;
  payment_screenshot?: any;
  remarks?: string;
  order_date?: string; // Format: YYYY-MM-DD
  items: CreateOrderItemInput[];
}

export interface UpdateOfflineOrderPayload {
  total_amount?: string | number;
  paid_amount?: string | number;
  payment_method?: OfflinePaymentMethod;
  payment_screenshot?: any;
  remarks?: string;
  order_date?: string;
  items?: CreateOrderItemInput[];
}

export interface OfflineOrderItemResponse {
  id: number;
  inventory: number;
  product_id: number;
  product_name: string;
  product_image: string | null;
  quantity: number;
}

export interface OfflinePaymentHistoryResponse {
  id: number;
  order: number;
  order_code: string;
  customer_store_name: string;
  customer_phone: string;
  amount: string;
  payment_method: OfflinePaymentMethod;
  payment_method_display: string;
  payment_date: string;
  payment_screenshot: string | null;
  remarks: string;
  recorded_by: number;
  recorded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface OfflineOrderDetailResponse {
  id: number;
  order_code: string;
  customer: number;
  customer_name: string;
  customer_contact_person: string;
  customer_phone: string;
  franchise: number;
  franchise_name: string;
  sales_person: number;
  sales_person_name: string;
  order_date: string;
  order_status: OfflineOrderStatus;
  payment_status: OfflinePaymentStatus;
  total_amount: string;
  paid_amount: string;
  remaining_amount: string;
  items_count: number;
  remarks: string | null;
  items: OfflineOrderItemResponse[];
  payment_history: OfflinePaymentHistoryResponse[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedOfflineOrdersResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: OfflineOrderDetailResponse[];
}

export interface FranchiseInventoryItem {
  id: number;
  product_id?: number;
  product_name?: string;
  quantity?: number;
  selling_price?: string | number;
  image?: string | null;
  [key: string]: any;
}

export interface Product {
  inventory_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  description?: string;
  total_amount?: number;
}

export interface OfflineSalesStats {
  total_customers: number;
  customers_with_pending_credit: number;
  total_orders: number;
  pending_orders_count: number;
  close_to_due_orders_count: number;
  overdue_orders_count: number;
  total_order_amount: string;
  total_paid_amount: string;
  total_remaining_amount: string;
}

export interface RecordOfflinePaymentPayload {
  customer?: number;
  order?: number;
  order_code?: string;
  amount: string;
  payment_method: OfflinePaymentMethod;
  remarks?: string;
}

export interface OfflinePaymentResponse {
  id: number;
  customer: number | null;
  customer_id: number | null;
  order: number | null;
  order_code: string | null;
  customer_store_name: string;
  customer_phone: string;
  amount: string;
  payment_method: OfflinePaymentMethod;
  payment_method_display: string;
  payment_date: string;
  payment_screenshot: string | null;
  remarks: string;
  recorded_by: number;
  recorded_by_name: string;
  created_at: string;
  updated_at: string;
}
