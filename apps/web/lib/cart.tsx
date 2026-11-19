"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FoodLabSelection } from "./types";

// The cart only remembers what was picked. Prices shown here are for display; the API prices every
// order again from the product table and the Food Lab rules, so an edited cart cannot change a total.
export type CartItem =
  | { key: string; kind: "product"; productId: number; name: string; price: number; image?: string | null; qty: number }
  | { key: string; kind: "custom"; selection: FoodLabSelection; name: string; details: string; price: number; qty: number };

type NewItem =
  | Omit<Extract<CartItem, { kind: "product" }>, "key" | "qty">
  | Omit<Extract<CartItem, { kind: "custom" }>, "key" | "qty">;

type CartValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: NewItem, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "thl-cart-v1";
const CartContext = createContext<CartValue | null>(null);

function keyOf(item: NewItem): string {
  return item.kind === "product" ? `p${item.productId}` : `c:${JSON.stringify(item.selection)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      // Browser storage is read after hydration so the server and first client render agree.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setItems(saved);
    } catch {
      // private window or blocked storage: start empty
    }
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // keep it in memory only
    }
  }, []);

  const add = useCallback(
    (item: NewItem, qty = 1) => {
      const key = keyOf(item);
      const existing = items.find((i) => i.key === key);
      persist(
        existing
          ? items.map((i) => (i.key === key ? { ...i, qty: Math.min(50, i.qty + qty) } : i))
          : [...items, { ...item, key, qty } as CartItem],
      );
    },
    [items, persist],
  );

  const setQty = useCallback(
    (key: string, qty: number) =>
      persist(qty <= 0 ? items.filter((i) => i.key !== key) : items.map((i) => (i.key === key ? { ...i, qty: Math.min(50, qty) } : i))),
    [items, persist],
  );

  const remove = useCallback((key: string) => persist(items.filter((i) => i.key !== key)), [items, persist]);
  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.qty * i.price, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [items, add, setQty, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart outside CartProvider");
  return value;
}
