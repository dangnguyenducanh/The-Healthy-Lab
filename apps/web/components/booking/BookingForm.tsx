"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Reservation = { id: number; reservation_time: string; party_size: number };

/** Book a table: POST /reservations (signed in). Times are the venue's local time. */
export function BookingForm({ submitLabel = "Book a table", onBooked }: { submitLabel?: string; onBooked?: (r: Reservation) => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(form: HTMLFormElement) {
    if (!user) {
      router.push("/login?next=/reservations");
      return;
    }
    const data = new FormData(form);
    const when = `${data.get("date")}T${data.get("time")}:00`;
    if (Number.isNaN(Date.parse(when)) || Date.parse(when) < Date.now()) {
      setState({ tone: "error", text: "Choose a date and time from now on." });
      return;
    }
    setBusy(true);
    setState(null);
    try {
      const booked = await api<Reservation>("/reservations", {
        method: "POST",
        json: {
          customer_name: String(data.get("name")).trim(),
          customer_phone: String(data.get("phone")).trim(),
          party_size: Number(data.get("party")),
          reservation_time: when,
          note: String(data.get("note") ?? "").trim() || null,
        },
      });
      form.reset();
      setState({ tone: "ok", text: `Booked for ${data.get("party")} on ${data.get("date")} at ${data.get("time")}. It is in your reservations.` });
      onBooked?.(booked);
    } catch (err) {
      setState({ tone: "error", text: err instanceof ApiError ? err.message : "Could not book. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form key={user?.id ?? "guest"} className="form" onSubmit={(e) => { e.preventDefault(); void submit(e.currentTarget); }}>
      <label className="field">Date<input name="date" type="date" required /></label>
      <label className="field">Time<input name="time" type="time" min="08:00" max="21:30" step="900" required /></label>
      <label className="field">Guests<input name="party" type="number" min={1} max={12} defaultValue={2} required /></label>
      <label className="field">Name<input name="name" autoComplete="name" maxLength={80} defaultValue={user?.name ?? ""} required /></label>
      <label className="field field--full">Phone<input name="phone" type="tel" autoComplete="tel" maxLength={32} defaultValue={user?.phone ?? ""} required /></label>
      <div className="btn-row"><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "Booking…" : submitLabel}</button></div>
      {!user && <p className="t-small muted">You will be asked to sign in before the booking is sent.</p>}
      {state && <p className="form-note" data-tone={state.tone} role={state.tone === "error" ? "alert" : "status"}>{state.text}</p>}
    </form>
  );
}
