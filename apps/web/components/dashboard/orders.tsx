"use client";

import { useState } from "react";
import { api, money } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";
import { ActionButton, Loaded, POLL_MS, Section, StatusText, Table, sentence, useApi, useRole } from "./kit";
import styles from "./dashboard.module.css";

const ORDER_STATUSES: OrderStatus[] = ["pending", "preparing", "ready", "delivering", "delivered", "cancelled"];

// The moves each board offers: the chef's and the driver's transitions in apps/api/services/orders.py.
type Step = { to: OrderStatus; label: string };
const STEPS: Record<"kitchen" | "delivery", Partial<Record<OrderStatus, Step>>> = {
  kitchen: { pending: { to: "preparing", label: "Start preparing" }, preparing: { to: "ready", label: "Mark ready" } },
  delivery: { ready: { to: "delivering", label: "Start delivery" }, delivering: { to: "delivered", label: "Mark delivered" } },
};

const COLUMN_TITLE: Partial<Record<OrderStatus, string>> = {
  pending: "New",
  preparing: "Preparing",
  ready: "Ready",
  delivering: "Out for delivery",
};

const setStatus = (id: number, status: OrderStatus) => api(`/orders/${id}/status`, { method: "PUT", json: { status } });

/** Live order columns for the kitchen or the drivers, oldest order first, polled every 20 s. */
export function OrderBoard({ kind }: { kind: "kitchen" | "delivery" }) {
  const role = useRole();
  // The API sends a chef only new and preparing orders and a driver only ready and delivering ones;
  // an admin gets every order, and on the kitchen board also sees the ready shelf.
  const columns: OrderStatus[] =
    kind === "delivery" ? ["ready", "delivering"] : role === "admin" ? ["pending", "preparing", "ready"] : ["pending", "preparing"];
  // ponytail: one request for the 200 newest orders; per-status requests if an admin's backlog ever passes that
  const orders = useApi<Order[]>("/orders?limit=200", POLL_MS);

  return (
    <Section id="orders" title={kind === "kitchen" ? "Order queue" : "Deliveries"} state={orders}>
      <Loaded state={orders}>
        {(list) => (
          <div className={styles.board}>
            {columns.map((status) => {
              const here = list.filter((o) => o.status === status).sort((a, b) => a.id - b.id);
              return (
                <section key={status} className={styles.column} aria-labelledby={`col-${status}`}>
                  <div className={styles.columnHead}>
                    <h3 id={`col-${status}`}>{COLUMN_TITLE[status]}</h3>
                    <span className="t-small muted">{here.length === 1 ? "1 order" : `${here.length} orders`}</span>
                  </div>
                  {here.length === 0 ? (
                    <p className="t-small muted">Nothing here.</p>
                  ) : (
                    <ol className={styles.cards}>
                      {here.map((o) => (
                        <li key={o.id}>
                          <OrderCard order={o} step={STEPS[kind][o.status]} delivery={kind === "delivery"} reload={orders.reload} />
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </Loaded>
    </Section>
  );
}

function OrderCard({ order, step, delivery, reload }: { order: Order; step?: Step; delivery: boolean; reload: () => Promise<void> }) {
  return (
    <article className={styles.card} aria-labelledby={`order-${order.id}`}>
      <div className={styles.cardHead}>
        <h4 id={`order-${order.id}`}>Order {order.id}</h4>
        <span className={`t-small ${styles.num}`}>{money(order.total_price)}</span>
      </div>
      <dl className={styles.facts}>
        <dt>Customer</dt>
        <dd>{order.customer_name}</dd>
        {delivery && (
          <>
            <dt>Phone</dt>
            <dd>{order.customer_phone ? <a className={styles.inlineLink} href={`tel:${order.customer_phone}`}>{order.customer_phone}</a> : "Not given"}</dd>
            <dt>Address</dt>
            <dd>{order.delivery_address}</dd>
          </>
        )}
        {order.note && (
          <>
            <dt>Note</dt>
            <dd>{order.note}</dd>
          </>
        )}
      </dl>
      <ul className={styles.items} aria-label={`Items in order ${order.id}`}>
        {order.items.map((i) => (
          <li key={i.id}>
            <span><span className={styles.num}>{i.quantity} ×</span> {i.product_name}</span>
            {i.custom_details && <span className="t-small muted">{i.custom_details}</span>}
          </li>
        ))}
      </ul>
      {step ? (
        <ActionButton run={() => setStatus(order.id, step.to)} done={reload} label={`${step.label}: order ${order.id}`}>
          {step.label}
        </ActionButton>
      ) : (
        <p className="t-small muted">Waiting for a driver.</p>
      )}
    </article>
  );
}

/** Admin: every order, newest first, with any status change (the API lets an admin make any move). */
export function AllOrders() {
  const [filter, setFilter] = useState("");
  const orders = useApi<Order[]>(`/orders?limit=100${filter ? `&status=${filter}` : ""}`, POLL_MS);

  return (
    <Section id="orders" title="Orders" state={orders}>
      <label className={`field ${styles.filter}`}>
        Show
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{sentence(s)}</option>
          ))}
        </select>
      </label>
      <Loaded state={orders} empty="No orders.">
        {(list) => (
          <Table caption="Orders, newest first" cols={["Order", "Customer", "Items", "Total", "Status", "Change status"]} num={[0, 3]}>
            {list.map((o) => (
              <tr key={o.id}>
                <td className={styles.num}>{o.id}</td>
                <td>{o.customer_name}</td>
                <td>{o.items.map((i) => `${i.quantity} × ${i.product_name}`).join(", ")}</td>
                <td className={styles.num}>{money(o.total_price)}</td>
                <td><StatusText value={o.status} attention={o.status === "pending"} /></td>
                <td><StatusChange order={o} reload={orders.reload} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

function StatusChange({ order, reload }: { order: Order; reload: () => Promise<void> }) {
  const [to, setTo] = useState<OrderStatus>(order.status);
  return (
    <div className={styles.inline}>
      <label className="sr-only" htmlFor={`status-${order.id}`}>New status for order {order.id}</label>
      <select id={`status-${order.id}`} className={styles.select} value={to} onChange={(e) => setTo(e.target.value as OrderStatus)}>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{sentence(s)}</option>
        ))}
      </select>
      <ActionButton variant="secondary" run={() => setStatus(order.id, to)} done={reload} disabled={to === order.status} label={`Save status of order ${order.id}`}>
        Save
      </ActionButton>
    </div>
  );
}
