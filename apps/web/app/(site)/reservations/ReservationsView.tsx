"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookingForm } from "@/components/booking/BookingForm";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Reservation = { id: number; reservation_time: string; party_size: number; status: "booked" | "seated" | "cancelled" | "completed" };
type QueueEntry = { id: number; party_size: number; status: "waiting" | "called" | "seated" | "cancelled"; wait_minutes: number };

const RESERVATION_STATUS: Record<Reservation["status"], string> = { booked: "Booked", seated: "Seated", cancelled: "Cancelled", completed: "Completed" };
const QUEUE_STATUS: Record<QueueEntry["status"], string> = { waiting: "Waiting", called: "Called: please come to the counter", seated: "Seated", cancelled: "Cancelled" };
const FLOW = { height: "auto", minHeight: "100svh" };

// Booking times are the venue's wall-clock time with no zone, so they are shown exactly as booked.
const bookedFor = (s: string) => new Date(s).toLocaleString("en-US", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const errorText = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong. Please try again.");

export function ReservationsView() {
  const { user, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [queue, setQueue] = useState<QueueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueNote, setQueueNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([api<Reservation[]>("/reservations?limit=20"), api<QueueEntry[]>("/queue?limit=1")])
      .then(([r, q]) => {
        setReservations(r);
        setQueue(q);
        setError(null);
      })
      .catch((err) => setError(errorText(err)));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function joinQueue(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setQueueNote(null);
    try {
      await api("/queue", {
        method: "POST",
        json: {
          customer_name: String(data.get("name")).trim(),
          customer_phone: String(data.get("phone")).trim() || null,
          party_size: Number(data.get("party")),
        },
      });
      load();
    } catch (err) {
      setQueueNote(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const signIn = (what: string) => (
    <div className="stack-4">
      <p>Sign in to see {what}.</p>
      <div className="btn-row"><Link className="btn btn--secondary" href="/login?next=/reservations">Sign in</Link></div>
    </div>
  );
  const active = queue?.find((q) => q.status === "waiting" || q.status === "called");

  return (
    <>
      <section className="section" aria-labelledby="res-h" style={FLOW}>
        <div className="wrap">
          <div className="section-head">
            <h1 id="res-h">Reservations</h1>
            <p>Book a table for 1 to 12 guests, booked to the quarter hour.</p>
          </div>
          <div className="grid grid--top">
            <div className="visit--card span-6">
              {/* remounted once the session is known, so name and phone are filled in */}
              <BookingForm key={user?.id ?? "guest"} onBooked={load} />
            </div>
            <div className="span-5 start-8 stack-4">
              <h2 className="t-h3">Your reservations</h2>
              {loading ? null : !user ? (
                signIn("your reservations")
              ) : error ? (
                <p className="form-note" data-tone="error" role="alert">{error}</p>
              ) : !reservations ? (
                <p className="muted" role="status">Loading…</p>
              ) : reservations.length === 0 ? (
                <p className="muted">No reservations yet.</p>
              ) : (
                <ul className="rows">
                  {reservations.map((r) => (
                    <li key={r.id}>
                      <span className="rows__name">{bookedFor(r.reservation_time)}</span>
                      <span className="rows__value">{RESERVATION_STATUS[r.status] ?? r.status}</span>
                      <p className="t-small muted">{r.party_size} {r.party_size === 1 ? "guest" : "guests"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section ground-surface" aria-labelledby="queue-h" style={FLOW}>
        <div className="wrap">
          <div className="section-head">
            <h2 id="queue-h">Virtual queue</h2>
            <p>No booking? Join the queue for the next free table and follow your place here.</p>
          </div>
          <div className="grid grid--top">
            <div className="span-6 stack-5">
              {loading ? null : !user ? (
                signIn("the queue")
              ) : active ? (
                <>
                  <ul className="rows">
                    <li><span className="rows__name">Status</span><span className="rows__value">{QUEUE_STATUS[active.status]}</span></li>
                    <li><span className="rows__name">Party</span><span className="rows__value">{active.party_size}</span></li>
                    {active.wait_minutes > 0 && (
                      <li><span className="rows__name">Estimated wait</span><span className="rows__value">{active.wait_minutes} min</span></li>
                    )}
                  </ul>
                  <div className="btn-row"><button className="btn btn--secondary" type="button" onClick={load}>Refresh status</button></div>
                </>
              ) : (
                <form className="form" onSubmit={(e) => { e.preventDefault(); void joinQueue(e.currentTarget); }}>
                  <label className="field">Name<input name="name" autoComplete="name" maxLength={80} defaultValue={user.name} required /></label>
                  <label className="field">Phone<input name="phone" type="tel" autoComplete="tel" maxLength={32} defaultValue={user.phone ?? ""} /></label>
                  <label className="field">Guests<input name="party" type="number" min={1} max={12} defaultValue={2} required /></label>
                  <div className="btn-row"><button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "Joining…" : "Join the queue"}</button></div>
                  {queueNote && <p className="form-note" data-tone="error" role="alert">{queueNote}</p>}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
