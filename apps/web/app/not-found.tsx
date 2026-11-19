import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main">
      <section className="section" aria-labelledby="nf-h">
        <div className="wrap">
          <p className="t-label"><Link className="link" href="/">{SITE.name}</Link></p>
          <h1 id="nf-h" style={{ marginTop: "var(--s-7)" }}>Page not found</h1>
          <p className="t-lead measure" style={{ marginTop: "var(--s-4)" }}>The page you asked for does not exist or has moved.</p>
          <div className="btn-row" style={{ marginTop: "var(--s-6)" }}>
            <Link className="btn btn--primary" href="/">Go to the home page</Link>
            <Link className="btn btn--secondary" href="/menu">Open the menu</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
