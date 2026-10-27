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
