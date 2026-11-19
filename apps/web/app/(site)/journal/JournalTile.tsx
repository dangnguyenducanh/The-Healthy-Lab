import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui/Arrow";
import { formatDate, type Article } from "@/lib/journal";

/** One article as an open tile: 4:3 cover, category, title, date, lead. */
export function JournalTile({ article, as: Heading = "h3" }: { article: Article; as?: "h2" | "h3" }) {
  return (
    <Link className="tile span-4" href={`/journal/${article.slug}`}>
      <div className="tile__media">
        <Image src={article.cover.src} alt={article.cover.alt} width={768} height={576} sizes="(max-width: 1023px) 100vw, 384px" />
      </div>
      <p className="t-label muted">{article.category}</p>
      <Heading className="t-card">{article.title}</Heading>
      <p className="t-small muted"><time dateTime={article.date}>{formatDate(article.date)}</time></p>
      <p>{article.lead}</p>
      <span className="link">Read the article<Arrow /></span>
    </Link>
  );
}
