"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS: Record<OrderStatus, string> = {
  pending: "Received",
  preparing: "Being prepared",
  ready: "Ready",
  delivering: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// The API stores UTC without a zone mark; read it as UTC and show it in the visitor's time.
const when = (s: string) =>
  new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(s) ? s : `${s}Z`).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export function OrderList() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api<Order[]>("/orders/my")
      .then(setOrders)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load your orders. Please try again."));
  }, [user]);

  if (!loading && !user) {
    return (
      <div className="stack-4">
        <p className="t-lead">Sign in to see your orders.</p>
        <div className="btn-row"><Link className="btn btn--primary" href="/login?next=/orders">Sign in</Link></div>
      </div>
    );
  }
  if (error) return <p className="form-note" data-tone="error" role="alert">{error}</p>;
  if (!orders) return <p className="muted" role="status">Loading your orders…</p>;
  if (orders.length === 0) {
    return (
      <div className="stack-4">
        <p className="t-lead">You have no orders yet.</p>
        <div className="btn-row"><Link className="btn btn--primary" href="/menu">See the menu</Link></div>
      </div>
    );
  }

  // Newest first: the API returns them by order number, highest first.
  return (
    <ul className="grid grid--top">
      {orders.map((o) => (
        <li className="span-8 stack-4" key={o.id} style={{ paddingBottom: "var(--s-7)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--s-4)", flexWrap: "wrap" }}>
            <h2 className="t-h3">Order {o.id}</h2>
            <span className="pill">{STATUS[o.status] ?? o.status}</span>
          </div>
          <p className="t-small muted">
            {o.created_at ? `${when(o.created_at)} · ` : ""}
            {o.delivery_address}
          </p>
          <ul className="rows">
            {o.items.map((it) => (
              <li key={it.id}>
                <span className="rows__name">{it.quantity} × {it.product_name}</span>
                <span className="rows__value">{money(it.total_price)}</span>
                {it.custom_details && <p className="t-small muted">{it.custom_details}</p>}
              </li>
            ))}
            <li>
              <span className="rows__name">Total</span>
              <span className="rows__value">{money(o.total_price)}</span>
            </li>
          </ul>
          {o.note && <p className="t-small muted">Note: {o.note}</p>}
        </li>
      ))}
    </ul>
  );
}
