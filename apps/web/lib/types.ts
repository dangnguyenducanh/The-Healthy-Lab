export type Role = "customer" | "chef" | "delivery" | "cashier" | "staff" | "admin";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  address?: string | null;
};

export type Product = {
  id: number;
  name: string;
  category: "bowls" | "wraps" | "salads" | "smoothies" | "juices" | string;
  description: string;
  price: number;
  calories: number;
  image_url?: string | null;
  is_available?: boolean;
};

export type FoodLabOption = { id: string; label: string; price_delta: number };
export type FoodLabOptions = {
  bases: FoodLabOption[];
  proteins: FoodLabOption[];
  extras: FoodLabOption[];
  dressings: FoodLabOption[];
};
export type FoodLabSelection = { base: string; protein: string; dressing: string; extras: string[] };

export type OrderStatus = "pending" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled";
export type OrderItem = {
  id: number;
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  custom_details?: string | null;
};
export type Order = {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  delivery_address: string;
  status: OrderStatus;
  total_price: number;
  note?: string | null;
  items: OrderItem[];
  created_at?: string;
};
