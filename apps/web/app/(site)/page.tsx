import Image from "next/image";
import Link from "next/link";
import { BookingForm } from "@/components/booking/BookingForm";
import { Closing } from "@/components/site/Closing";
import { Hours, OpenNow } from "@/components/site/Hours";
import { Arrow } from "@/components/ui/Arrow";
import { HeadRow } from "@/components/ui/HeadRow";
import { money } from "@/lib/api";
import { serverGet } from "@/lib/server-api";
import { MAIN_ACTION, MAP_URL, SITE } from "@/lib/site";
import type { FoodLabOptions, Product } from "@/lib/types";

const GROUPS = [
  { id: "bowls", label: "Bowls", categories: ["bowls"] },
  { id: "wraps", label: "Wraps and salads", categories: ["wraps", "salads"] },
  { id: "drinks", label: "Smoothies and juice", categories: ["smoothies", "juices"] },
];

const STRIP = [
  { src: "/images/bento-salmon-bg.jpg", alt: "Grilled salmon with roast potatoes on a table by the window" },
  { src: "/images/bento-fruit-bg.jpg", alt: "Yogurt bowl with berries, mango and granola" },
  { src: "/images/hero-bowl-card.jpg", alt: "Chicken bowl with chickpeas, carrot and red cabbage" },
  { src: "/images/bento-smoothie-bg.jpg", alt: "Green smoothie in a jar with mint" },
];

const LAB_PHOTOS: Record<string, { src: string; alt: string }> = {
  "quinoa-bowl": { src: "/images/hero-salad-plate.jpg", alt: "Quinoa bowl with sweet potato, chickpeas and avocado" },
  "greens-salad": { src: "/images/food-menu-4.jpg", alt: "Green salad with tomato, cucumber and parmesan" },
  "whole-wheat-wrap": { src: "/images/food-menu-3.jpg", alt: "Whole-wheat wrap cut in half on a plate" },
};
const LAB_BASE_PRICE = 5; // the API's Food Lab base price before the base's own surcharge

export default async function HomePage() {
  const [products, lab] = await Promise.all([
    serverGet<Product[]>("/products?limit=100", []),
    serverGet<FoodLabOptions | null>("/food-lab/options", null),
  ]);
  const rowsFor = (categories: string[]) => products.filter((p) => categories.includes(p.category)).slice(0, 3);

  return (
    <>
    <main id="main">
      <section className="hero hero--place" aria-labelledby="hero-h">
        <Image
          className="hero__bg"
          src="/images/hero-bg-table.jpg"
          alt="Table set with a salad bowl, eggs, radishes and fresh herbs"
          width={1024}
          height={1024}
          sizes="100vw"
          preload
          fetchPriority="high"
          style={{ ["--ly-pos" as string]: "50% 45%" }}
        />
        <div className="wrap">
          <div className="hero-text">
            <div className="hero__text">
              <h1 id="hero-h">Healthy kitchen on {SITE.street}</h1>
              <p className="hero__lead">Bowls, wraps, salads and cold-pressed juice, 08:00 to 22:00 on weekdays.</p>
              <div className="btn-row">
                <Link className="btn btn--primary" href={MAIN_ACTION.href}>{MAIN_ACTION.label}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="visit" data-place="visit" aria-labelledby="visit-h" style={{ ["--hm" as string]: 2 }}>
        <div className="wrap">
          <div className="section-head">
            <h2 id="visit-h">Find us</h2>
          </div>
          <p className="type-moment"><a href={MAP_URL} target="_blank" rel="noopener">{SITE.street}, {SITE.district}</a></p>
          <div className="grid grid--top" style={{ marginTop: "var(--s-7)" }}>
            <div className="visit visit--card span-6">
              <div className="stack-2">
                <p className="t-label muted">Visit</p>
                <OpenNow className="t-small" />
              </div>
              <div className="visit__cols">
                <div className="visit__col stack-4">
                  <address className="visit__address">{SITE.street}<br />{SITE.district}</address>
                  <a className="link" href={MAP_URL} target="_blank" rel="noopener">Get directions</a>
                </div>
                <div className="visit__col"><Hours /></div>
              </div>
              <ul className="visit__rows">
                <li><span>Order ahead</span><span>Collect at the counter or have it delivered</span></li>
              </ul>
            </div>
            <figure className="pl-photo pl-photo--end span-6" style={{ ["--pl-r" as string]: 1.3333, ["--pl-head" as string]: "260px" }}>
              <Image src="/images/bento-salad-bg.jpg" alt="Salad bowl with avocado on a wooden table by the window" width={1024} height={768} sizes="(max-width: 1023px) 100vw, 588px" />
            </figure>
          </div>
        </div>
      </section>

      <section className="section ground-surface" id="menu" aria-labelledby="menu-h" style={{ ["--hm" as string]: 2 }}>
        <div className="wrap">
          <HeadRow id="menu-h" title="Menu and prices">
            <p>Every dish made to order. <Link className="link" href="/menu">Full menu<Arrow /></Link></p>
          </HeadRow>
          <div className="grid grid--top" style={{ marginTop: "56px" }}>
            {GROUPS.map((g) => (
              <div className="span-4" key={g.id}>
                <p className="t-label" style={{ marginBottom: "var(--s-3)" }}>{g.label}</p>
                <ul className="rows">
                  {rowsFor(g.categories).map((p) => (
                    <li key={p.id}>
                      <span className="rows__name">{p.name}</span>
                      <span className="rows__value">{money(p.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="grid strip" style={{ marginTop: "var(--s-7)" }}>
            {STRIP.map((photo) => (
              <Link className="pl-photo span-3" href="/menu" key={photo.src} style={{ ["--pl-r" as string]: 1 }}>
                <Image src={photo.src} alt={photo.alt} width={600} height={600} sizes="(max-width: 639px) 50vw, 282px" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="food-lab" aria-labelledby="lab-h" style={{ ["--hm" as string]: 2 }}>
        <div className="wrap">
          <HeadRow id="lab-h" title="Build your own bowl">
            <p>Pick a base, a protein, up to three extras and a dressing.</p>
          </HeadRow>
          <div className="grid grid--top lab-tiles" style={{ marginTop: "56px" }}>
            {(lab?.bases ?? []).map((base) => {
              const photo = LAB_PHOTOS[base.id] ?? LAB_PHOTOS["quinoa-bowl"];
              return (
                <Link className="tile span-4" href={`/food-lab?base=${base.id}`} key={base.id}>
                  <div className="tile__media"><Image src={photo.src} alt={photo.alt} width={768} height={960} sizes="(max-width: 1023px) 100vw, 384px" /></div>
                  <div className="tile__head">
                    <h3>{base.label}</h3>
                    <span className="tile__price">from {money(LAB_BASE_PRICE + base.price_delta)}</span>
                  </div>
                  <p className="muted">Priced as you build: salmon, chicken or none, then avocado, greens and your dressing.</p>
                  <span className="link">Build a {base.label.toLowerCase()}<Arrow /></span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" id="booking" aria-labelledby="booking-h" style={{ ["--hm" as string]: 2 }}>
        <div className="wrap">
          <HeadRow id="booking-h" title="Book a table">
            <p>Tables for 1 to 12 guests, booked to the quarter hour.</p>
          </HeadRow>
          <div className="grid grid--top" style={{ marginTop: "56px" }}>
            <figure className="pl-photo span-6" style={{ ["--pl-r" as string]: 1.3333, ["--pl-head" as string]: "120px" }}>
              <Image src="/images/about-food-spread.jpg" alt="Table of baked oat bites, tea and fruit" width={1024} height={768} sizes="(max-width: 1023px) 100vw, 588px" />
            </figure>
            <div className="visit--card span-6"><BookingForm /></div>
          </div>
        </div>
      </section>

    </main>
    <Closing />
    </>
  );
}
