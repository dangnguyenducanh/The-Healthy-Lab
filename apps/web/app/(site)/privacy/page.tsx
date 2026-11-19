import type { Metadata } from "next";
import { Closing } from "@/components/site/Closing";
import { SITE } from "@/lib/site";
import s from "../journal/journal.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What The Healthy Lab website stores about you, and how to ask for it to be deleted.",
};

export default function PrivacyPage() {
  return (
    <>
      <main id="main">
        <section className={`section ${s.flow}`} aria-labelledby="privacy-h">
          <div className="wrap">
            <div className={`${s.head} measure`}>
              <h1 id="privacy-h">Privacy</h1>
              <p className="t-lead">What this website stores about you, in plain words. Last updated November 2026.</p>
            </div>
            <div className={`${s.body} measure`}>
              <p>This website is a demonstration project for {SITE.name}. Please treat anything you enter as test data.</p>
              <h2>What we store</h2>
              <ul>
                <li>Your account: name, email address and a hashed password. We never keep your password itself.</li>
                <li>Your phone number and delivery address, only if you give them.</li>
                <li>Your orders and your table reservations.</li>
              </ul>
              <p>The kitchen and front-of-house team see your orders and reservations so they can prepare and deliver them.</p>
              <h2>Cookies and browser storage</h2>
              <ul>
                <li>thl_access and thl_refresh are sign-in cookies. They are httpOnly, so scripts on the page cannot read them.</li>
                <li>thl_session only marks that a session exists, so the site knows whether to check your sign-in.</li>
                <li>Your cart is kept in your browser&rsquo;s localStorage on your device. It is not sent to us until you place an order.</li>
              </ul>
              <p>We do not use analytics or advertising cookies, and we do not sell your data.</p>
              <h2>Asking for deletion</h2>
              <p>Email us from the address on your account and ask us to delete it. We will remove your account and the data tied to it.</p>
              <p><a className="btn btn--secondary" href={`mailto:${SITE.email}?subject=Delete%20my%20account`}>Email to ask for deletion</a></p>
            </div>
          </div>
        </section>
      </main>
      <Closing />
    </>
  );
}
