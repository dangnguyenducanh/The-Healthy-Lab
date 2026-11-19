import { CartView } from "@/components/cart/CartView";
import { Closing } from "@/components/site/Closing";

export const metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <>
      <main id="main">
        <section className="section" aria-labelledby="cart-h" style={{ height: "auto", minHeight: "100svh" }}>
          <div className="wrap">
            <div className="section-head">
              <h1 id="cart-h">Your cart</h1>
            </div>
            <CartView />
          </div>
        </section>
      </main>
      <Closing />
    </>
  );
}
