import type { Metadata } from "next";
import { Closing } from "@/components/site/Closing";
import { ARTICLES } from "@/lib/journal";
import { JournalTile } from "./JournalTile";
import s from "./journal.module.css";

export const metadata: Metadata = {
  title: "Journal",
  description: "Notes from The Healthy Lab kitchen on bowls, fermented foods and easy morning habits.",
};

export default function JournalPage() {
  return (
    <>
      <main id="main">
        <section className={`section ${s.flow}`} aria-labelledby="journal-h">
          <div className="wrap">
            <div className={s.head}>
              <h1 id="journal-h">Journal</h1>
              <p className="t-lead measure">Notes from the kitchen on what we cook and how we eat.</p>
            </div>
            <div className="grid grid--top">
              {ARTICLES.map((a) => <JournalTile key={a.slug} article={a} as="h2" />)}
            </div>
          </div>
        </section>
      </main>
      <Closing />
    </>
  );
}
