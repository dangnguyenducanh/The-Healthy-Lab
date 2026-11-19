"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { DASHBOARD_FOR_ROLE, MAIN_ACTION, SITE } from "@/lib/site";

const MENU_CARDS = [
  { href: "/menu#bowls", title: "Bowls", line: "Grain bowls with protein", img: "/images/food-menu-5.jpg", alt: "Quinoa bowl with avocado and roast sweet potato" },
  { href: "/menu#wraps", title: "Wraps and salads", line: "Whole-grain wraps, big salads", img: "/images/food-menu-3.jpg", alt: "Whole-grain wrap cut in half on a plate" },
  { href: "/menu#smoothies", title: "Smoothies and juice", line: "Blended and cold-pressed daily", img: "/images/food-menu-2.jpg", alt: "Glass of fresh orange juice" },
  { href: "/food-lab", title: "Build your own", line: "Pick base, protein and dressing", img: "/images/food-lab-plate.jpg", alt: "Bowl with salmon, edamame and vegetables" },
];

const WORDS = [
  { href: "/food-lab", label: "Food Lab" },
  { href: "/journal", label: "Journal" },
  { href: "/#visit", label: "Visit" },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    // a new page closes the phone menu (React's reset-on-prop-change pattern, no effect needed)
    setOpenedOn(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.documentElement.classList.toggle("nav-locked", open);
  }, [open]);

  const current = (href: string) => (pathname === href.split("#")[0] && !href.includes("#") ? "page" : undefined);
  const account = user ? DASHBOARD_FOR_ROLE[user.role] ?? "/orders" : "/login";

  return (
    <header className={`nav${open ? " is-open" : ""}`} onClick={(e) => open && (e.target as HTMLElement).closest("a") && setOpen(false)}>
      <div className="wrap nav__bar">
        <a className="sr-only" href="#main">Skip to content</a>
        <Link className="nav__logo" href="/">
          <span className="mark" data-mark="arc" aria-hidden="true" />
          {SITE.name}
        </Link>
        <nav className="nav__links" aria-label="Main">
          <div className="nav__item">
            <Link className="nav__link" href="/menu" aria-current={current("/menu")}>
              Menu
              <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="nav__menu">
              <div className="wrap grid">
                {MENU_CARDS.map((card) => (
                  <Link key={card.href} className="menu-card span-3" href={card.href}>
                    <div className="panel">
                      <Image className="frame__img" src={card.img} alt={card.alt} width={282} height={212} sizes="282px" />
                    </div>
                    <span className="t-card">{card.title}</span>
                    <span className="t-small muted">{card.line}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {WORDS.map((w) => (
            <div className="nav__item" key={w.href}>
              <Link className="nav__link" href={w.href} aria-current={current(w.href)}>{w.label}</Link>
            </div>
          ))}
        </nav>
        <div className="nav__actions">
          <Link className="nav__link" href="/cart" aria-current={current("/cart")}>
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
          <Link className="nav__link" href={account}>{user ? "Account" : "Sign in"}</Link>
          <Link className="btn btn--primary" href={MAIN_ACTION.href}>{MAIN_ACTION.label}</Link>
        </div>
        <button className="nav__toggle" type="button" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 5h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
