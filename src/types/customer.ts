// src/types/customer.ts

export interface OfflineCustomer {
  id: number | string;
  store_name: string;
  contact_person: string;
  phone_number: string;
  address: string;
  created_at?: string;
  updated_at?: string;
}

export interface OfflineCustomerDetail {
  id: number | string;
  store_name: string;
  contact_person: string;
  phone_number: string;
  address?: string;
  franchise?: number | null;
  franchise_name?: string | null;
  sales_person?: number | null;
  sales_person_name?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  total_orders_count: number;
  total_purchased_amount: number;
  total_paid_amount: number;
  total_remaining_amount: number;
}

export interface CreateCustomerPayload {
  store_name: string;
  contact_person: string;
  phone_number: string;
  address: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

export interface PaginatedCustomersResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: OfflineCustomer[];
}
