import Link from "next/link";
import { MAIN_ACTION } from "@/lib/site";

export function ActionBar() {
  return (
    <nav className="actionbar" aria-label="Quick actions">
      <Link className="btn btn--primary" href={MAIN_ACTION.href}>{MAIN_ACTION.label}</Link>
    </nav>
  );
}
