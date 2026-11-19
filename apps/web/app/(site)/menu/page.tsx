import Image from "next/image";
import Link from "next/link";
import { AddToCart } from "@/components/menu/AddToCart";
import { Closing } from "@/components/site/Closing";
import { HeadRow } from "@/components/ui/HeadRow";
import { money } from "@/lib/api";
import { serverGet } from "@/lib/server-api";
import type { Product } from "@/lib/types";

export const metadata = { title: "Menu and prices" };

// The nav links to /menu#bowls, #wraps and #smoothies, so these ids are fixed.
const CATEGORIES = [
  { id: "bowls", label: "Bowls" },
  { id: "wraps", label: "Wraps" },
  { id: "salads", label: "Salads" },
  { id: "smoothies", label: "Smoothies" },
  { id: "juices", label: "Juices" },
];

// A section grows with its dishes instead of keeping the kit's fixed screen height.
const FLOW = { height: "auto", minHeight: "100svh" };

// Only photographs served from this site: next/image and the CSP refuse anything else.
const localImage = (src?: string | null) => (src && src.startsWith("/") && !src.startsWith("//") ? src : null);

export default async function MenuPage() {
  const products = await serverGet<Product[]>("/products?limit=100", []);
  const known = new Set(CATEGORIES.map((c) => c.id));
  const others = [...new Set(products.map((p) => p.category.toLowerCase()))]
    .filter((c) => !known.has(c))
    .map((c) => ({ id: c.replace(/[^a-z0-9]+/g, "-"), label: c[0].toUpperCase() + c.slice(1), category: c }));
  const groups = [...CATEGORIES.map((c) => ({ ...c, category: c.id })), ...others]
    .map((g) => ({ ...g, items: products.filter((p) => p.category.toLowerCase() === g.category) }))
    .filter((g) => g.items.length > 0);

  const intro = (
    <div className="section-head">
      <h1>Menu and prices</h1>
      <p>
        Every dish made to order, to collect at the counter or have delivered. Or{" "}
        <Link className="link" href="/food-lab">build your own</Link>.
      </p>
    </div>
  );

  return (
    <>
      <main id="main">
        {groups.length === 0 && (
          <section className="section" aria-label="Menu">
            <div className="wrap">
              {intro}
              <p className="form-note" data-tone="error" role="alert">The menu could not be loaded. Please try again in a moment.</p>
            </div>
          </section>
        )}
        {groups.map((g, i) => (
          <section className="section" id={g.id} aria-labelledby={`${g.id}-h`} key={g.id} style={FLOW}>
            <div className="wrap">
              {i === 0 && intro}
              <HeadRow id={`${g.id}-h`} title={g.label} />
              <div className="grid grid--top" style={{ marginTop: "var(--s-7)" }}>
                {g.items.map((p) => {
                  const src = localImage(p.image_url);
                  return (
                    <div className="tile span-4" key={p.id}>
                      <div className="tile__media">
                        {src && (
                          <Image src={src} alt={p.name} width={768} height={576} quality={70} sizes="(max-width: 1023px) 50vw, 410px" loading={i === 0 ? "eager" : undefined} />
                        )}
                      </div>
                      <div className="tile__head">
                        <h3>{p.name}</h3>
                        <span className="tile__price">{money(p.price)}</span>
                      </div>
                      <p className="tile__facts">{p.calories} kcal</p>
                      <p>{p.description}</p>
                      <AddToCart product={p} />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </main>
      <Closing />
    </>
  );
}
