"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { DASHBOARD_FOR_ROLE, SITE } from "@/lib/site";
import type { Role } from "@/lib/types";
import styles from "./dashboard.module.css";

// The API refuses every call a role may not make; this only decides what to show.
const DASHBOARDS: { href: string; title: string; roles: Role[] }[] = [
  { href: "/dashboard/admin", title: "Admin", roles: ["admin"] },
  { href: "/dashboard/kitchen", title: "Kitchen", roles: ["chef", "admin"] },
  { href: "/dashboard/cashier", title: "Cashier", roles: ["cashier", "admin"] },
  { href: "/dashboard/delivery", title: "Delivery", roles: ["delivery", "admin"] },
  { href: "/dashboard/staff", title: "Dining room and stock", roles: ["staff", "admin"] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const page = DASHBOARDS.find((d) => pathname === d.href || pathname.startsWith(`${d.href}/`));

  if (loading) {
    return <p className={styles.gate} role="status">Loading your dashboard…</p>;
  }
  if (!user) {
    return (
      <div className={styles.gate}>
        <p>Sign in with a staff account to open this page.</p>
        <Link className={`link ${styles.target}`} href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
      </div>
    );
  }

  const allowed = !page || page.roles.includes(user.role);
  const home = DASHBOARD_FOR_ROLE[user.role];

  async function signOut() {
    setLeaving(true);
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">Skip to content</a>
      <aside className={styles.side}>
        <Link className={styles.brand} href="/">
          <span className="mark" data-mark="arc" aria-hidden="true" />
          {SITE.name}
        </Link>
        <nav className={styles.nav} aria-label="Dashboards">
          <ul>
            {DASHBOARDS.filter((d) => d.roles.includes(user.role)).map((d) => (
              <li key={d.href}>
                <Link href={d.href} aria-current={d === page ? "page" : undefined}>{d.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.account}>
          <p className="t-small">
            <span className={styles.who}>{user.name}</span>
            <span className="muted">{user.role[0].toUpperCase() + user.role.slice(1)}</span>
          </p>
          <button type="button" className="btn btn--secondary" onClick={signOut} disabled={leaving}>
            {leaving ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <main id="main" className={styles.main} tabIndex={-1}>
        <header className={styles.header}>
          <h1>{page?.title ?? "Dashboard"}</h1>
        </header>
        {/* a wrapper, so the site's one-section-per-screen rule for main > section never applies here */}
        {allowed ? (
          <div className={styles.content}>{children}</div>
        ) : (
          <div className="stack-4">
            <p>This page is for {page.roles.join(" and ")} accounts.</p>
            {home ? (
              <Link className={`link ${styles.target}`} href={home}>Open your dashboard</Link>
            ) : (
              <Link className={`link ${styles.target}`} href="/">Back to the site</Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
