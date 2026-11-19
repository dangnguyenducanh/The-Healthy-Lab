import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/ui/Arrow";
import { HOURS, MAIN_ACTION, MAP_URL, SITE } from "@/lib/site";
import { Hours } from "./Hours";

const weekLine = HOURS.filter((r) => r.open)
  .map((r) => `${r.label} ${r.open} to ${r.close}`)
  .join(", ");

/** footer.closing: the close (close-photo) then the footer-visit directory. One per page, last. */
export function Closing({ photo = { src: "/images/cook-plating.jpg", alt: "A cook plating a bowl at the pass" } }: { photo?: { src: string; alt: string } }) {
  return (
    <footer className="footer closing footer--visit" id="contact" aria-labelledby="close-h">
      <div className="wrap">
        <div className="closing__cta close--photo">
          <div className="section-head--split">
            <div>
              <h2 id="close-h">Order online for collection or delivery</h2>
              <p className="t-lead">{weekLine}.</p>
            </div>
            <Link className="btn btn--primary" href={MAIN_ACTION.href}>
              {MAIN_ACTION.label}
              <Arrow />
            </Link>
          </div>
          <div className="close__media">
            <Image src={photo.src} alt={photo.alt} width={800} height={800} sizes="(max-width: 640px) 100vw, 588px" />
          </div>
        </div>
        <div className="closing__links">
          <div className="grid">
            <div className="span-6 stack-4">
              <address className="footer__address">
                <a className="link" href={MAP_URL} rel="noopener" target="_blank">{SITE.street}, {SITE.district}</a>
              </address>
              <p>
                <a className="link" href={`mailto:${SITE.email}`}>Email us</a>
              </p>
            </div>
            <div className="span-6 start-7 stack-4">
              <h4>Opening hours</h4>
              <Hours />
            </div>
          </div>
          <div className="footer__legal">
            <span>
              &copy; {new Date().getFullYear()} {SITE.name} &nbsp; <Link href="/privacy">Privacy</Link> &nbsp; <Link href="/terms">Terms</Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
