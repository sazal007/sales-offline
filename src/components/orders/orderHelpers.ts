// src/components/orders/orderHelpers.ts

import type {
  OfflineOrderStatus,
  OfflinePaymentMethod,
  Product,
} from "@/types/offlineSales";

export const STATUS_FILTERS: (OfflineOrderStatus | "All")[] = [
  "All",
  "Pending",
  "Confirmed",
  "Delivered",
  "Cancelled",
];

export const PAYMENT_METHODS: { key: OfflinePaymentMethod; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "online", label: "Online / QR" },
  { key: "cheque", label: "Cheque" },
  { key: "bank_transfer", label: "Bank Transfer" },
];

export interface SelectedOrderItem {
  inventory_id: number;
  quantity: number;
  product?: Product;
}

export const getOrderStatusBadge = (status: OfflineOrderStatus) => {
  switch (status) {
    case "Delivered":
      return {
        bg: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
      };
    case "Confirmed":
      return {
        bg: "bg-blue-50 border-blue-200",
        text: "text-blue-700",
      };
    case "Cancelled":
      return {
        bg: "bg-red-50 border-red-200",
        text: "text-red-700",
      };
    default:
      return {
        bg: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
      };
  }
};

export const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "Paid":
      return {
        bg: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
      };
    case "Partial":
      return {
        bg: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
      };
    default:
      return {
        bg: "bg-red-50 border-red-200",
        text: "text-red-700",
      };
  }
};
