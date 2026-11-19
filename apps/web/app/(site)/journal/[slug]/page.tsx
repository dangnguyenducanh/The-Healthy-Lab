import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Closing } from "@/components/site/Closing";
import { ARTICLES, formatDate, getArticle } from "@/lib/journal";
import { JournalTile } from "../JournalTile";
import s from "../journal.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return { title: article.title, description: article.lead };
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const others = ARTICLES.filter((a) => a.slug !== article.slug);

  return (
    <>
      <main id="main">
        <article className={`section ${s.flow}`} aria-labelledby="article-h">
          <div className="wrap">
            <div className="grid">
              <header className={`${s.head} span-8`}>
                <p className={`t-label muted ${s.meta}`}>
                  <span>{article.category}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={article.date}>{formatDate(article.date)}</time>
                </p>
                <h1 id="article-h">{article.title}</h1>
                <p className="t-lead">{article.lead}</p>
              </header>
              <figure className={`pl-photo span-8 ${s.photo}`} style={{ ["--pl-r" as string]: 1.5 }}>
                <Image src={article.cover.src} alt={article.cover.alt} width={1024} height={683} sizes="(max-width: 1023px) 100vw, 780px" preload />
              </figure>
              <div className={`${s.body} measure span-12`}>
                {article.body.map((b, i) => {
                  switch (b.type) {
                    case "heading": return <h2 key={i}>{b.text}</h2>;
                    case "quote": return <blockquote key={i}>{b.text}</blockquote>;
                    case "list": return <ul key={i}>{b.items.map((t) => <li key={t}>{t}</li>)}</ul>;
                    default: return <p key={i}>{b.text}</p>;
                  }
                })}
              </div>
            </div>
          </div>
        </article>
        <section className={`section ${s.flow}`} aria-labelledby="more-h" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <h2 id="more-h" className={s.more}>More from the journal</h2>
            <div className="grid grid--top">
              {others.map((a) => <JournalTile key={a.slug} article={a} />)}
            </div>
          </div>
        </section>
      </main>
      <Closing />
    </>
  );
}
