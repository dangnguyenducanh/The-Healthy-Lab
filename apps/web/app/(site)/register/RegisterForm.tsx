"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { safeNext, useAuth } from "@/lib/auth";

export function RegisterForm({ next }: { next?: string }) {
  const { register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      await register({
        name: text("name"),
        email: text("email"),
        password: String(data.get("password")),
        phone: text("phone") || undefined,
        address: text("address") || undefined,
      });
      router.replace(safeNext(next));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }}>
      <label className="field field--full">Name<input name="name" autoComplete="name" maxLength={80} required /></label>
      <label className="field field--full">Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label className="field field--full">
        Password (8 to 72 characters)
        <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
      </label>
      <label className="field">Phone (optional)<input name="phone" type="tel" autoComplete="tel" maxLength={32} /></label>
      <label className="field">Delivery address (optional)<input name="address" autoComplete="street-address" maxLength={200} /></label>
      <div className="btn-row"><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button></div>
      {error && <p className="form-note" data-tone="error" role="alert">{error}</p>}
      <p className="t-small">
        Already have an account? <Link className="link" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in</Link>
      </p>
    </form>
  );
}
