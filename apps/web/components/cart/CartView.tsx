"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { api, ApiError, money } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import type { Order } from "@/lib/types";

const COLLECT = "Collect at the counter";
const FIELDSET = { border: 0, padding: 0, margin: 0, minWidth: 0 };
const noSubscribe = () => () => {};

export function CartView() {
  const { items, subtotal, setQty, remove, clear } = useCart();
  const { user, loading } = useAuth();
  // The cart lives in localStorage: render nothing on the server rather than an "empty cart" flash.
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [collect, setCollect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mounted) return null;

  if (placed) {
    return (
      <div className="stack-4" role="status">
        <h2>Order {placed.id} is placed</h2>
        <p className="t-lead">
          Total {money(placed.total_price)}.{" "}
          {placed.delivery_address === COLLECT ? "Collect it at the counter." : `Delivery to ${placed.delivery_address}.`}
        </p>
        <div className="btn-row">
          <Link className="btn btn--primary" href="/orders">View your orders</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="stack-4">
        <p className="t-lead">Your cart is empty.</p>
        <div className="btn-row">
          <Link className="btn btn--primary" href="/menu">See the menu</Link>
          <Link className="btn btn--secondary" href="/food-lab">Build your own</Link>
        </div>
      </div>
    );
  }

  async function placeOrder(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      // No prices are sent: the API prices every line from the menu and the Food Lab rules.
      const order = await api<Order>("/orders", {
        method: "POST",
        json: {
          customer_name: text("name"),
          customer_phone: text("phone"),
          delivery_address: collect ? COLLECT : text("address"),
          note: text("note") || null,
          items: items.map((i) =>
            i.kind === "product" ? { product_id: i.productId, quantity: i.qty } : { custom_food_lab: i.selection, quantity: i.qty },
          ),
        },
      });
      clear();
      setPlaced(order);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Your session has ended. Sign in again to place the order."
          : err instanceof ApiError
            ? err.message
            : "Could not place the order. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid--top">
      <div className="span-7 stack-4">
        <ul className="rows">
          {items.map((i) => (
            <li key={i.key}>
              <span className="rows__name">{i.name}</span>
              <span className="rows__value">{money(i.price * i.qty)}</span>
              {i.kind === "custom" && <p className="t-small muted">{i.details}</p>}
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
                <div role="group" aria-label={`Quantity of ${i.name}`} style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
                  <button className="btn btn--secondary btn--sm" type="button" aria-label="One fewer" onClick={() => setQty(i.key, i.qty - 1)}>−</button>
                  <span style={{ minWidth: "2ch", textAlign: "center" }}>{i.qty}</span>
                  <button className="btn btn--secondary btn--sm" type="button" aria-label="One more" disabled={i.qty >= 50} onClick={() => setQty(i.key, i.qty + 1)}>+</button>
                </div>
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => remove(i.key)}>Remove</button>
              </div>
            </li>
          ))}
          <li>
            <span className="rows__name">Subtotal</span>
            <span className="rows__value">{money(subtotal)}</span>
          </li>
        </ul>
        <p className="t-small muted">The total is confirmed when you place the order.</p>
      </div>

      <div className="visit--card span-5 stack-5">
        <h2 className="t-h3">Checkout</h2>
        {loading ? null : user ? (
          <form className="form" onSubmit={(e) => { e.preventDefault(); void placeOrder(e.currentTarget); }}>
            <label className="field">Name<input name="name" autoComplete="name" maxLength={80} defaultValue={user.name} required /></label>
            <label className="field">Phone<input name="phone" type="tel" autoComplete="tel" maxLength={32} defaultValue={user.phone ?? ""} required /></label>
            {/* not .field: its input styles would stretch the radios to text-box size */}
            <fieldset className="field--full stack-2" style={FIELDSET}>
              <legend className="t-small" style={{ padding: 0, marginBottom: "var(--s-2)", fontWeight: 500 }}>How you get it</legend>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
                <input type="radio" name="fulfilment" checked={!collect} onChange={() => setCollect(false)} /> Delivery
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
                <input type="radio" name="fulfilment" checked={collect} onChange={() => setCollect(true)} /> {COLLECT}
              </label>
            </fieldset>
            {!collect && (
              <label className="field field--full">
                Delivery address
                <input name="address" autoComplete="street-address" maxLength={200} defaultValue={user.address ?? ""} required />
              </label>
            )}
            <label className="field field--full">Note<textarea name="note" maxLength={300} /></label>
            <div className="btn-row">
              <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "Placing order…" : "Place order"}</button>
            </div>
            {error && <p className="form-note" data-tone="error" role="alert">{error}</p>}
          </form>
        ) : (
          <>
            <p>Sign in or create an account to place your order.</p>
            <div className="btn-row">
              <Link className="btn btn--primary" href="/login?next=/cart">Sign in to check out</Link>
              <Link className="btn btn--secondary" href="/register?next=/cart">Create an account</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
