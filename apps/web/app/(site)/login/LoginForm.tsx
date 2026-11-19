"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { safeNext, useAuth } from "@/lib/auth";
import { DASHBOARD_FOR_ROLE } from "@/lib/site";

export function LoginForm({ next }: { next?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const user = await login(String(data.get("email")).trim(), String(data.get("password")));
      router.replace(safeNext(next, DASHBOARD_FOR_ROLE[user.role] ?? "/"));
    } catch (err) {
      // 401 "Invalid email or password", 429 the lockout message: the API's words as they are.
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }}>
      <label className="field field--full">Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label className="field field--full">Password<input name="password" type="password" autoComplete="current-password" maxLength={128} required /></label>
      <div className="btn-row"><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></div>
      {error && <p className="form-note" data-tone="error" role="alert">{error}</p>}
      <p className="t-small">
        No account yet? <Link className="link" href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>Create an account</Link>
      </p>
    </form>
  );
}
