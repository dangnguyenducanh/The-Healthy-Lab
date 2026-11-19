"use client";

import { useEffect, useRef, useState } from "react";
import { api, money } from "@/lib/api";
import type { Product, User } from "@/lib/types";
import { ActionButton, AddPanel, EntityForm, type Field, Loaded, Section, StatusText, Table, type Values, qty, sentence, text, useApi } from "./kit";
import type { AdminSummary, StaffProfile, Voucher } from "./types";
import styles from "./dashboard.module.css";

/** The figures from GET /admin/summary. */
export function SummarySection() {
  const summary = useApi<AdminSummary>("/admin/summary");
  return (
    <Section id="summary" title="Summary" state={summary}>
      <Loaded state={summary}>
        {(s) => (
          <dl className={styles.stats}>
            {(
              [
                ["New orders, not started", s.pending_orders],
                ["In the kitchen (new and preparing)", s.kitchen_orders],
                ["Ready or out for delivery", s.delivery_orders],
                ["Delivered", s.delivered_orders],
                ["Orders in total", s.total_orders],
                ["Revenue from delivered orders", money(s.total_revenue)],
                ["Payments settled", s.paid_orders],
                ["Customers", s.total_customers],
                ["Dishes on sale", `${s.active_products} of ${s.total_products}`],
                ["Ingredients running low", s.low_stock_items],
                ["Lots expiring within 7 days", s.expiring_lots],
                ["Bookings booked or seated", s.active_reservations],
                ["Parties waiting to be seated", s.waiting_queue],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="t-small muted">{label}</dt>
                <dd className="t-stat">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Loaded>
    </Section>
  );
}

const CATEGORIES = ["bowls", "wraps", "salads", "smoothies", "juices"];

function productFields(p?: Product): Field[] {
  const categories = p && !CATEGORIES.includes(p.category) ? [...CATEGORIES, p.category] : CATEGORIES;
  return [
    { name: "name", label: "Name", required: true, maxLength: 120, value: p?.name },
    { name: "category", label: "Category", type: "select", required: true, options: categories.map((c) => ({ value: c, label: sentence(c) })), value: p?.category },
    { name: "price", label: "Price (USD)", type: "number", required: true, min: 0.01, step: "0.01", value: p?.price },
    { name: "calories", label: "Calories", type: "number", required: true, min: 0, step: "1", value: p?.calories },
    { name: "image_url", label: "Photograph path, such as /images/food-menu-5.jpg", full: true, maxLength: 300, value: p?.image_url },
    { name: "description", label: "Description", type: "textarea", required: true, maxLength: 500, value: p?.description },
    { name: "is_available", label: "On sale", type: "checkbox", value: p ? p.is_available : true },
  ];
}

const productBody = (v: Values) => ({
  name: v.name.trim(),
  category: v.category,
  description: v.description.trim(),
  price: Number(v.price),
  calories: Number(v.calories),
  image_url: text(v.image_url) ?? null,
  is_available: v.is_available === "on",
});

/** Every dish, including those off sale: add, edit, take off sale and put back. */
export function ProductsSection() {
  const products = useApi<Product[]>("/products?include_disabled=true&limit=200");
  const [editing, setEditing] = useState<Product | null>(null);
  const editTitle = useRef<HTMLHeadingElement>(null);
  const editingId = editing?.id;
  useEffect(() => {
    if (editingId) editTitle.current?.focus();
  }, [editingId]);

  return (
    <Section id="products" title="Menu" state={products}>
      <AddPanel label="Add a dish">
        <EntityForm
          fields={productFields()}
          submit={(v) => api("/products", { method: "POST", json: productBody(v) })}
          done={products.reload}
          submitLabel="Add dish"
          ok="Dish added."
        />
      </AddPanel>
      {editing && (
        <div className={styles.panel}>
          <h3 className={styles.panelTitle} tabIndex={-1} ref={editTitle}>Edit {editing.name}</h3>
          <EntityForm
            key={editing.id}
            fields={productFields(editing)}
            submit={(v) => api(`/products/${editing.id}`, { method: "PUT", json: productBody(v) })}
            done={async () => {
              setEditing(null);
              await products.reload();
            }}
            submitLabel="Save changes"
            ok="Saved."
            onCancel={() => setEditing(null)}
          />
        </div>
      )}
      <Loaded state={products} empty="No dishes yet.">
        {(list) => (
          <Table caption="Dishes" cols={["Dish", "Category", "Price", "Calories", "Status", "Action"]} num={[2, 3]}>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{sentence(p.category)}</td>
                <td className={styles.num}>{money(p.price)}</td>
                <td className={styles.num}>{qty(p.calories)}</td>
                <td><StatusText value={p.is_available ? "on sale" : "off sale"} attention={!p.is_available} /></td>
                <td>
                  <div className={styles.inline}>
                    <button type="button" className="btn btn--secondary" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>Edit</button>
                    <ActionButton
                      variant="secondary"
                      run={() => api(`/products/${p.id}`, { method: "PUT", json: { is_available: !p.is_available } })}
                      done={products.reload}
                      label={`${p.is_available ? "Disable" : "Enable"} ${p.name}`}
                    >
                      {p.is_available ? "Disable" : "Enable"}
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

/** Every account. The API has no endpoint to change a role or disable an account. */
export function UsersSection() {
  const users = useApi<User[]>("/users");
  return (
    <Section id="users" title="Accounts" state={users}>
      <Loaded state={users} empty="No accounts.">
        {(list) => (
          <Table caption="Accounts" cols={["Name", "Email", "Role", "Phone"]}>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{sentence(u.role)}</td>
                <td>{u.phone ?? "None"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

const STAFF_ROLES = ["chef", "cashier", "delivery", "staff", "admin"];
const SHIFT_STATUSES = ["On duty", "Standby", "Off duty"];

/** Staff profiles (rota names, shifts, status), optionally linked to a sign-in account. */
export function StaffSection() {
  const staff = useApi<StaffProfile[]>("/staff");
  const users = useApi<User[]>("/users");
  const email = new Map(users.data?.map((u) => [u.id, u.email]));

  return (
    <Section id="staff" title="Staff" state={staff}>
      <AddPanel label="Add a staff profile">
        <EntityForm
          fields={[
            { name: "name", label: "Name", required: true, maxLength: 80 },
            { name: "role", label: "Role", type: "select", required: true, options: STAFF_ROLES.map((r) => ({ value: r, label: sentence(r) })) },
            { name: "shift", label: "Shift", maxLength: 40 },
            { name: "status", label: "Status", type: "select", required: true, options: SHIFT_STATUSES.map((s) => ({ value: s, label: s })), value: "Standby" },
            {
              name: "user_id",
              label: "Sign-in account",
              type: "select",
              full: true,
              options: (users.data ?? []).filter((u) => u.role !== "customer").map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
            },
          ]}
          submit={(v) =>
            api("/staff", {
              method: "POST",
              json: { name: v.name.trim(), role: v.role, shift: text(v.shift), status: v.status, user_id: v.user_id ? Number(v.user_id) : undefined },
            })
          }
          done={staff.reload}
          submitLabel="Add profile"
          ok="Staff profile added."
        />
      </AddPanel>
      <Loaded state={staff} empty="No staff profiles yet.">
        {(list) => (
          <Table caption="Staff profiles" cols={["Name", "Role", "Shift", "Status", "Sign-in account"]}>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{sentence(s.role)}</td>
                <td>{s.shift ?? "None"}</td>
                <td><StatusText value={s.status} /></td>
                <td>{s.user_id ? email.get(s.user_id) ?? `Account ${s.user_id}` : "Not linked"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

/** Vouchers, drafts included. The API only lists them; there is no create or edit endpoint. */
export function VouchersSection() {
  const vouchers = useApi<Voucher[]>("/vouchers");
  return (
    <Section id="vouchers" title="Vouchers" state={vouchers}>
      <Loaded state={vouchers} empty="No vouchers.">
        {(list) => (
          <Table caption="Vouchers" cols={["Code", "Description", "Discount", "Minimum order", "Status"]} num={[2, 3]}>
            {list.map((v) => (
              <tr key={v.id}>
                <td className={styles.code}>{v.code}</td>
                <td>{v.description}</td>
                <td className={styles.num}>{v.discount_percent ? `${qty(v.discount_percent)}%` : "None"}</td>
                <td className={styles.num}>{money(v.min_order_total)}</td>
                <td><StatusText value={v.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}
