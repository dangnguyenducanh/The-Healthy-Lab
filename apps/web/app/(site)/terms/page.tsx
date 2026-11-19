import type { Metadata } from "next";
import Link from "next/link";
import { Closing } from "@/components/site/Closing";
import { SITE } from "@/lib/site";
import s from "../journal/journal.module.css";

export const metadata: Metadata = {
  title: "Terms",
  description: "How orders, payments and bookings work at The Healthy Lab.",
};

export default function TermsPage() {
  return (
    <>
      <main id="main">
        <section className={`section ${s.flow}`} aria-labelledby="terms-h">
          <div className="wrap">
            <div className={`${s.head} measure`}>
              <h1 id="terms-h">Terms</h1>
              <p className="t-lead">How ordering and booking work. Last updated November 2026.</p>
            </div>
            <div className={`${s.body} measure`}>
              <p>This website is a demonstration project for {SITE.name}. These terms describe how the demo behaves.</p>
              <h2>Orders</h2>
              <p>Orders are prepared on request, once you place them. You can collect an order at the counter or have it delivered.</p>
              <h2>Payments</h2>
              <p>There are no online card payments. Payment is recorded when you collect your order or when it is delivered.</p>
              <h2>Bookings</h2>
              <p>You can cancel a table booking by contacting the restaurant.</p>
              <h2>Your account</h2>
              <p>Keep your sign-in details to yourself. See the <Link href="/privacy">privacy page</Link> for what we store.</p>
              <h2>Contact</h2>
              <p><a className="btn btn--secondary" href={`mailto:${SITE.email}`}>Email the restaurant</a></p>
            </div>
          </div>
        </section>
      </main>
      <Closing />
    </>
  );
}
