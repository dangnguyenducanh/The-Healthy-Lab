// Shapes of the staff API (apps/api/schemas.py) that lib/types.ts does not cover.
// Server stamps (created_at, imported_at, expires_at) are naive UTC; reservation_time is naive venue time.

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type Payment = { id: number; order_id: number; amount: number; method: string; status: PaymentStatus; created_at: string };

export type ReservationStatus = "booked" | "seated" | "cancelled" | "completed";
export type Reservation = {
  id: number;
  user_id?: number | null;
  table_id?: number | null;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  reservation_time: string;
  status: ReservationStatus;
  note?: string | null;
};

export type QueueStatus = "waiting" | "called" | "seated" | "cancelled";
export type QueueEntry = {
  id: number;
  customer_name: string;
  customer_phone?: string | null;
  party_size: number;
  status: QueueStatus;
  wait_minutes: number;
  created_at: string;
};

export type DiningTable = { id: number; name: string; capacity: number; status: string };

export type InventoryItem = { id: number; name: string; unit: string; stock: number; low_stock_threshold: number; expires_at?: string | null };
export type Ingredient = { id: number; name: string; unit: string; low_stock_threshold: number };
export type Supplier = { id: number; name: string; contact_name?: string | null; phone?: string | null; item?: string | null };
export type InventoryLot = {
  id: number;
  ingredient_id: number;
  supplier_id?: number | null;
  quantity: number;
  remaining_quantity: number;
  unit_cost: number;
  imported_at: string;
  expires_at?: string | null;
};
export type RecipeItem = { id: number; product_id: number; ingredient_id: number; quantity: number };

export type Notification = { id: number; title: string; message: string; level: string; is_read: boolean; created_at: string };

export type StaffProfile = { id: number; user_id?: number | null; name: string; role: string; shift?: string | null; status: string };
export type Voucher = { id: number; code: string; description: string; discount_percent: number; min_order_total: number; status: string };

export type AdminSummary = {
  total_orders: number;
  pending_orders: number;
  delivered_orders: number;
  total_revenue: number;
  total_customers: number;
  total_products: number;
  active_products: number;
  kitchen_orders: number;
  delivery_orders: number;
  low_stock_items: number;
  expiring_lots: number;
  active_reservations: number;
  waiting_queue: number;
  paid_orders: number;
};
