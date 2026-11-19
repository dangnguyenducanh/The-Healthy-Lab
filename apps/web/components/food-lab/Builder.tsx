"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, money } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { FoodLabOption, FoodLabOptions, FoodLabSelection } from "@/lib/types";

type Preview = { product_name: string; custom_details: string; unit_price: number; total_price: number };

// Photographs that show the option itself. An option missing here gets no photograph rather than a wrong one.
const PHOTOS: Record<string, string> = {
  "quinoa-bowl": "/images/hero-salad-plate.jpg",
  "greens-salad": "/images/food-menu-4.jpg",
  "whole-wheat-wrap": "/images/food-menu-3.jpg",
  chicken: "/images/herbed-chicken.jpg",
  salmon: "/images/grilled-salmon.jpg",
  avocado: "/images/avocado.jpg",
};

const MAX_EXTRAS = 3;
const delta = (o: FoodLabOption) => (o.price_delta > 0 ? `+${money(o.price_delta)}` : "");
const FIELDSET = { border: 0, padding: 0, margin: 0, minWidth: 0 };

export function Builder({ options, initialBase }: { options: FoodLabOptions; initialBase: string }) {
  const { add } = useCart();
  const [base, setBase] = useState(initialBase);
  const [protein, setProtein] = useState(options.proteins[0]?.id ?? "none");
  const [dressing, setDressing] = useState(options.dressings[0]?.id ?? "");
  const [extras, setExtras] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState<{ key: string; data?: Preview; error?: string } | null>(null);
  const [added, setAdded] = useState(0);

  // Fixed key order and extras in menu order, so the same bowl is one cart line however it was picked.
  const selection: FoodLabSelection = { base, protein, dressing, extras: options.extras.map((o) => o.id).filter((id) => extras.includes(id)) };
  const key = JSON.stringify({ selection, quantity });

  // The server prices the bowl; ask it 250ms after the last change and ignore answers that arrive late.
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      api<Preview>("/food-lab/preview", { method: "POST", body: key, headers: { "Content-Type": "application/json" } })
        .then((data) => live && setPreview({ key, data }))
        .catch((err) => live && setPreview({ key, error: err instanceof ApiError ? err.message : "Could not price this bowl. Please try again." }));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [key]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(0), 4000);
    return () => clearTimeout(t);
  }, [added]);

  const current = preview?.key === key ? preview : null;
  const shown = current?.data ?? preview?.data;
  const label = (list: FoodLabOption[], id: string) => list.find((o) => o.id === id)?.label ?? id;

  function addToCart() {
    if (!current?.data) return;
    add({ kind: "custom", selection, name: current.data.product_name, details: current.data.custom_details, price: current.data.unit_price }, quantity);
    setAdded((n) => n + 1);
  }

  const radioRows = (name: string, list: FoodLabOption[], value: string, set: (id: string) => void) => (
    <ul className="rows">
      {list.map((o) => (
        <li key={o.id} style={{ alignItems: "center" }}>
          <OptionLabel option={o}>
            <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => set(o.id)} />
          </OptionLabel>
          <span className="rows__value">{delta(o)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid grid--top">
      <div className="span-7 stack-6">
        <fieldset style={FIELDSET}>
          <legend style={{ padding: 0, marginBottom: "var(--s-4)" }}><h2 className="t-h3">Base</h2></legend>
          <div className="grid grid--top">
            {options.bases.map((o) => (
              <label className="tile span-4" key={o.id} style={{ cursor: "pointer" }}>
                <span className="tile__media" style={base === o.id ? { outline: "2px solid var(--p-accent)", outlineOffset: 2 } : undefined}>
                  {PHOTOS[o.id] && <Image src={PHOTOS[o.id]} alt="" width={480} height={360} quality={70} sizes="(max-width: 1023px) 50vw, 230px" />}
                </span>
                <span className="tile__head">
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
                    <input type="radio" name="base" value={o.id} checked={base === o.id} onChange={() => setBase(o.id)} />
                    {o.label}
                  </span>
                  <span className="tile__price t-small">{delta(o)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset style={FIELDSET}>
          <legend style={{ padding: 0, marginBottom: "var(--s-4)" }}><h2 className="t-h3">Protein</h2></legend>
          {radioRows("protein", options.proteins, protein, setProtein)}
        </fieldset>

        <fieldset style={FIELDSET}>
          <legend style={{ padding: 0, marginBottom: "var(--s-4)" }}>
            <h2 className="t-h3">Extras</h2>
            <span className="t-small muted">Up to {MAX_EXTRAS}</span>
          </legend>
          <ul className="rows">
            {options.extras.map((o) => {
              const on = extras.includes(o.id);
              return (
                <li key={o.id} style={{ alignItems: "center" }}>
                  <OptionLabel option={o}>
                    <input
                      type="checkbox"
                      value={o.id}
                      checked={on}
                      disabled={!on && extras.length >= MAX_EXTRAS}
                      onChange={() => setExtras(on ? extras.filter((id) => id !== o.id) : [...extras, o.id])}
                    />
                  </OptionLabel>
                  <span className="rows__value">{delta(o)}</span>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <fieldset style={FIELDSET}>
          <legend style={{ padding: 0, marginBottom: "var(--s-4)" }}><h2 className="t-h3">Dressing</h2></legend>
          {radioRows("dressing", options.dressings, dressing, setDressing)}
        </fieldset>
      </div>

      <aside className="visit--card span-5 stack-5" aria-labelledby="lab-summary-h" style={{ position: "sticky", top: "calc(var(--nav) + var(--s-5))" }}>
        <h2 id="lab-summary-h" className="t-h3">{shown?.product_name ?? "Your bowl"}</h2>
        <ul className="rows rows--spec">
          <li><span className="rows__name">Base</span><span className="rows__value">{label(options.bases, base)}</span></li>
          <li><span className="rows__name">Protein</span><span className="rows__value">{label(options.proteins, protein)}</span></li>
          <li><span className="rows__name">Extras</span><span className="rows__value">{selection.extras.map((id) => label(options.extras, id)).join(", ") || "None"}</span></li>
          <li><span className="rows__name">Dressing</span><span className="rows__value">{label(options.dressings, dressing)}</span></li>
        </ul>
        <label className="field">
          Quantity
          <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="price" aria-live="polite" style={current?.data ? undefined : { opacity: 0.5 }}>
          <span className="t-stat">{shown ? money(shown.total_price) : "–"}</span>
          {shown && quantity > 1 && <span className="muted">{money(shown.unit_price)} each</span>}
        </div>
        <div className="btn-row">
          <button className="btn btn--primary" type="button" disabled={!current?.data} onClick={addToCart}>Add to cart</button>
        </div>
        <p className="form-note" data-tone={current?.error ? "error" : "ok"} role="status">
          {current?.error ??
            (added > 0 ? (
              <>Added to cart. <Link className="link" href="/cart">View cart</Link></>
            ) : null)}
        </p>
      </aside>
    </div>
  );
}

function OptionLabel({ option, children }: { option: FoodLabOption; children: React.ReactNode }) {
  const photo = PHOTOS[option.id];
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "var(--s-4)", cursor: "pointer" }}>
      {children}
      {photo && (
        <Image src={photo} alt="" width={56} height={56} quality={70} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: "var(--r-sm)" }} />
      )}
      <span className="rows__name">{option.label}</span>
    </label>
  );
}
