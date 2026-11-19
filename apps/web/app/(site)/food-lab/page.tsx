import { Builder } from "@/components/food-lab/Builder";
import { Closing } from "@/components/site/Closing";
import { serverGet } from "@/lib/server-api";
import type { FoodLabOptions } from "@/lib/types";

export const metadata = { title: "Build your own" };

export default async function FoodLabPage({ searchParams }: { searchParams: Promise<{ base?: string | string[] }> }) {
  const [{ base }, options] = await Promise.all([searchParams, serverGet<FoodLabOptions | null>("/food-lab/options", null)]);
  const initialBase = options?.bases.find((b) => b.id === base)?.id ?? options?.bases[0]?.id;

  return (
    <>
      <main id="main">
        <section className="section" aria-labelledby="lab-h" style={{ height: "auto", minHeight: "100svh" }}>
          <div className="wrap">
            <div className="section-head">
              <h1 id="lab-h">Build your own</h1>
              <p>Pick a base, a protein, up to three extras and a dressing. The price updates as you choose.</p>
            </div>
            {options && initialBase ? (
              <Builder options={options} initialBase={initialBase} />
            ) : (
              <p className="form-note" data-tone="error" role="alert">The Food Lab could not be loaded. Please try again in a moment.</p>
            )}
          </div>
        </section>
      </main>
      <Closing photo={{ src: "/images/food-lab-plate.jpg", alt: "Bowl with salmon, edamame and vegetables" }} />
    </>
  );
}
