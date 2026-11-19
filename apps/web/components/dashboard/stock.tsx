"use client";

import { api, money } from "@/lib/api";
import type { Product } from "@/lib/types";
import { AddPanel, EntityForm, Loaded, Section, StatusText, Table, num, qty, stamp, text, useApi, useRole } from "./kit";
import type { Ingredient, InventoryItem, InventoryLot, Notification, RecipeItem, Supplier } from "./types";
import styles from "./dashboard.module.css";

const isLow = (i: InventoryItem) => i.stock <= i.low_stock_threshold;

/** Stock per ingredient from GET /inventory (admin, chef, staff); what is running low first. */
export function InventorySection() {
  const inventory = useApi<InventoryItem[]>("/inventory");
  return (
    <Section id="inventory" title="Inventory" state={inventory}>
      <Loaded state={inventory} empty="No ingredients are tracked yet.">
        {(items) => {
          const low = items.filter(isLow).length;
          const sorted = [...items].sort((a, b) => Number(isLow(b)) - Number(isLow(a)));
          return (
            <>
              <p className="t-small">{low === 0 ? "Nothing is running low." : `${low} of ${items.length} ingredients running low, listed first.`}</p>
              <Table caption="Stock by ingredient" cols={["Ingredient", "In stock", "Reorder at", "Status", "First expiry"]} num={[1, 2]}>
                {sorted.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td className={styles.num}>{qty(i.stock)} {i.unit}</td>
                    <td className={styles.num}>{qty(i.low_stock_threshold)} {i.unit}</td>
                    <td><StatusText value={isLow(i) ? "low" : "in stock"} attention={isLow(i)} /></td>
                    <td className={styles.num}>{stamp(i.expires_at, false)}</td>
                  </tr>
                ))}
              </Table>
            </>
          );
        }}
      </Loaded>
    </Section>
  );
}

/** Deliveries of stock (admin, staff): every lot with what is left, and a form to book one in. */
export function LotsSection() {
  const lots = useApi<InventoryLot[]>("/inventory/lots");
  const ingredients = useApi<Ingredient[]>("/ingredients");
  const suppliers = useApi<Supplier[]>("/suppliers");
  const ingredient = new Map(ingredients.data?.map((i) => [i.id, i]));
  const supplier = new Map(suppliers.data?.map((s) => [s.id, s.name]));

  return (
    <Section id="lots" title="Stock lots" state={lots}>
      <AddPanel label="Book in a delivery">
        <EntityForm
          fields={[
            { name: "ingredient_id", label: "Ingredient", type: "select", required: true, options: (ingredients.data ?? []).map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })) },
            { name: "supplier_id", label: "Supplier", type: "select", options: (suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })) },
            { name: "quantity", label: "Quantity", type: "number", required: true, min: 0.01 },
            { name: "unit_cost", label: "Cost per unit (USD)", type: "number", min: 0, step: "0.01", value: 0 },
            { name: "expires", label: "Use by", type: "date" },
          ]}
          submit={(v) =>
            api("/inventory/lots", {
              method: "POST",
              json: {
                ingredient_id: Number(v.ingredient_id),
                supplier_id: num(v.supplier_id),
                quantity: Number(v.quantity),
                unit_cost: num(v.unit_cost) ?? 0,
                // Stamps are naive UTC; noon UTC keeps the chosen date in every zone within 12 hours.
                expires_at: v.expires ? `${v.expires}T12:00:00` : undefined,
              },
            })
          }
          done={lots.reload}
          submitLabel="Book in"
          ok="Delivery booked in. Refresh the inventory to see the new stock."
        />
      </AddPanel>
      <Loaded state={lots} empty="No deliveries booked in yet.">
        {(list) => (
          <Table caption="Stock lots, soonest expiry first" cols={["Lot", "Ingredient", "Supplier", "Received", "Left", "Unit cost", "Use by"]} num={[0, 4, 5]}>
            {list.map((l) => {
              const ing = ingredient.get(l.ingredient_id);
              return (
                <tr key={l.id}>
                  <td className={styles.num}>{l.id}</td>
                  <td>{ing?.name ?? `Ingredient ${l.ingredient_id}`}</td>
                  <td>{l.supplier_id ? supplier.get(l.supplier_id) ?? `Supplier ${l.supplier_id}` : "None"}</td>
                  <td className={styles.num}>{stamp(l.imported_at, false)}</td>
                  <td className={styles.num}>{qty(l.remaining_quantity)} of {qty(l.quantity)} {ing?.unit}</td>
                  <td className={styles.num}>{money(l.unit_cost)}</td>
                  <td className={styles.num}>{stamp(l.expires_at, false)}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

/** Ingredients (admin, chef, staff read; admin and staff add). */
export function IngredientsSection() {
  const role = useRole();
  const ingredients = useApi<Ingredient[]>("/ingredients");
  return (
    <Section id="ingredients" title="Ingredients" state={ingredients}>
      {(role === "admin" || role === "staff") && (
        <AddPanel label="Add an ingredient">
          <EntityForm
            fields={[
              { name: "name", label: "Name", required: true, maxLength: 80 },
              { name: "unit", label: "Unit (kg, liters, pcs)", required: true, maxLength: 20 },
              { name: "low_stock_threshold", label: "Reorder at", type: "number", min: 0, value: 0 },
            ]}
            submit={(v) =>
              api("/ingredients", { method: "POST", json: { name: v.name.trim(), unit: v.unit.trim(), low_stock_threshold: num(v.low_stock_threshold) ?? 0 } })
            }
            done={ingredients.reload}
            submitLabel="Add ingredient"
            ok="Ingredient added."
          />
        </AddPanel>
      )}
      <Loaded state={ingredients} empty="No ingredients yet.">
        {(list) => (
          <Table caption="Ingredients" cols={["Ingredient", "Unit", "Reorder at"]} num={[2]}>
            {list.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.unit}</td>
                <td className={styles.num}>{qty(i.low_stock_threshold)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

/** Suppliers (admin, staff): list and add. */
export function SuppliersSection() {
  const suppliers = useApi<Supplier[]>("/suppliers");
  return (
    <Section id="suppliers" title="Suppliers" state={suppliers}>
      <AddPanel label="Add a supplier">
        <EntityForm
          fields={[
            { name: "name", label: "Company", required: true, maxLength: 120 },
            { name: "contact_name", label: "Contact", maxLength: 80 },
            { name: "phone", label: "Phone", type: "tel", maxLength: 32 },
            { name: "item", label: "Supplies", maxLength: 120 },
          ]}
          submit={(v) =>
            api("/suppliers", { method: "POST", json: { name: v.name.trim(), contact_name: text(v.contact_name), phone: text(v.phone), item: text(v.item) } })
          }
          done={suppliers.reload}
          submitLabel="Add supplier"
          ok="Supplier added."
        />
      </AddPanel>
      <Loaded state={suppliers} empty="No suppliers yet.">
        {(list) => (
          <Table caption="Suppliers" cols={["Company", "Contact", "Phone", "Supplies"]}>
            {list.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.contact_name ?? "None"}</td>
                <td>{s.phone ? <a className={styles.inlineLink} href={`tel:${s.phone}`}>{s.phone}</a> : "None"}</td>
                <td>{s.item ?? "None"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

/** Recipes: what one of each dish takes (admin, chef, staff read; admin and chef add a line). */
export function RecipesSection() {
  const role = useRole();
  const recipes = useApi<RecipeItem[]>("/recipes");
  const products = useApi<Product[]>("/products?limit=200");
  const ingredients = useApi<Ingredient[]>("/ingredients");
  const product = new Map(products.data?.map((p) => [p.id, p.name]));
  const ingredient = new Map(ingredients.data?.map((i) => [i.id, i]));

  return (
    <Section id="recipes" title="Recipes" state={recipes}>
      {(role === "admin" || role === "chef") && (
        <AddPanel label="Add a recipe line">
          <EntityForm
            fields={[
              { name: "product_id", label: "Dish", type: "select", required: true, options: (products.data ?? []).map((p) => ({ value: p.id, label: p.name })) },
              { name: "ingredient_id", label: "Ingredient", type: "select", required: true, options: (ingredients.data ?? []).map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` })) },
              { name: "quantity", label: "Quantity per dish", type: "number", required: true, min: 0.001 },
            ]}
            submit={(v) =>
              api("/recipes", { method: "POST", json: { product_id: Number(v.product_id), ingredient_id: Number(v.ingredient_id), quantity: Number(v.quantity) } })
            }
            done={recipes.reload}
            submitLabel="Add line"
            ok="Recipe line added."
          />
        </AddPanel>
      )}
      <Loaded state={recipes} empty="No recipes yet.">
        {(list) => (
          <Table caption="Recipe lines by dish" cols={["Dish", "Ingredient", "Per dish"]} num={[2]}>
            {list.map((r) => {
              const ing = ingredient.get(r.ingredient_id);
              return (
                <tr key={r.id}>
                  <td>{product.get(r.product_id) ?? `Dish ${r.product_id}`}</td>
                  <td>{ing?.name ?? `Ingredient ${r.ingredient_id}`}</td>
                  <td className={styles.num}>{qty(r.quantity)} {ing?.unit}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

/** Stock alerts the API raises (admin, chef, staff); there is no endpoint to mark them read. */
export function NotificationsSection() {
  const notes = useApi<Notification[]>("/notifications?limit=50");
  return (
    <Section id="notifications" title="Notifications" state={notes}>
      <Loaded state={notes} empty="No notifications.">
        {(list) => (
          <Table caption="Notifications, newest first" cols={["Level", "Title", "Message", "Raised"]} num={[3]}>
            {list.map((n) => (
              <tr key={n.id}>
                <td><StatusText value={n.level} attention={n.level !== "info"} /></td>
                <td>{n.title}</td>
                <td>{n.message}</td>
                <td className={styles.num}>{stamp(n.created_at)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}
