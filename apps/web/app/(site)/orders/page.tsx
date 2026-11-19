import { Closing } from "@/components/site/Closing";
import { OrderList } from "./OrderList";

export const metadata = { title: "Your orders" };

export default function OrdersPage() {
  return (
    <>
      <main id="main">
        <section className="section" aria-labelledby="orders-h" style={{ height: "auto", minHeight: "100svh" }}>
          <div className="wrap">
            <div className="section-head">
              <h1 id="orders-h">Your orders</h1>
            </div>
            <OrderList />
          </div>
        </section>
      </main>
      <Closing />
    </>
  );
}
