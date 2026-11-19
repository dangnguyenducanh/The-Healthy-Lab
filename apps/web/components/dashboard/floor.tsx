"use client";

import { useState } from "react";
import { api, money } from "@/lib/api";
import { ActionButton, AddPanel, type ApiState, EntityForm, Loaded, POLL_MS, Section, StatusText, Table, sentence, stamp, useApi, useRole, venueToday, wallClock } from "./kit";
import type { DiningTable, Payment, PaymentStatus, QueueEntry, Reservation } from "./types";
import styles from "./dashboard.module.css";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "momo", label: "MoMo" },
  { value: "bank_transfer", label: "Bank transfer" },
];
const methodLabel = (m: string) => METHODS.find((x) => x.value === m)?.label ?? sentence(m);

const putPayment = (id: number, status: PaymentStatus) => api(`/payments/${id}/status`, { method: "PUT", json: { status } });

/** Payments (admin, cashier): record one against an order, then settle, fail or refund it. */
export function PaymentsSection() {
  const [filter, setFilter] = useState<PaymentStatus | "">("pending");
  const payments = useApi<Payment[]>(`/payments?limit=100${filter ? `&status=${filter}` : ""}`, POLL_MS);

  return (
    <Section id="payments" title="Payments" state={payments}>
      <AddPanel label="Record a payment">
        <EntityForm
          fields={[
            { name: "order_id", label: "Order number", type: "number", required: true, min: 1, step: "1" },
            { name: "amount", label: "Amount (USD)", type: "number", required: true, min: 0.01, step: "0.01" },
            { name: "method", label: "Method", type: "select", required: true, options: METHODS, value: "cash" },
            {
              name: "status",
              label: "Status",
              type: "select",
              required: true,
              options: [
                { value: "paid", label: "Paid now" },
                { value: "pending", label: "Awaiting payment" },
              ],
              value: "paid",
            },
          ]}
          submit={(v) =>
            api("/payments", { method: "POST", json: { order_id: Number(v.order_id), amount: Number(v.amount), method: v.method, status: v.status } })
          }
          done={payments.reload}
          submitLabel="Record payment"
          ok="Payment recorded."
        />
      </AddPanel>
      <label className={`field ${styles.filter}`}>
        Show
        <select value={filter} onChange={(e) => setFilter(e.target.value as PaymentStatus | "")}>
          <option value="pending">Awaiting payment</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="">All payments</option>
        </select>
      </label>
      <Loaded state={payments} empty={filter === "pending" ? "Nothing is awaiting payment." : "No payments."}>
        {(list) => (
          <Table caption="Payments, newest first" cols={["Payment", "Order", "Amount", "Method", "Status", "Recorded", "Action"]} num={[0, 1, 2, 5]}>
            {list.map((p) => (
              <tr key={p.id}>
                <td className={styles.num}>{p.id}</td>
                <td className={styles.num}>{p.order_id}</td>
                <td className={styles.num}>{money(p.amount)}</td>
                <td>{methodLabel(p.method)}</td>
                <td><StatusText value={p.status === "pending" ? "awaiting payment" : p.status} attention={p.status === "pending"} /></td>
                <td className={styles.num}>{stamp(p.created_at)}</td>
                <td>
                  <div className={styles.inline}>
                    {(p.status === "pending" || p.status === "failed") && (
                      <ActionButton run={() => putPayment(p.id, "paid")} done={payments.reload} label={`Mark payment ${p.id} paid`}>Mark paid</ActionButton>
                    )}
                    {p.status === "pending" && (
                      <ActionButton variant="secondary" run={() => putPayment(p.id, "failed")} done={payments.reload} label={`Mark payment ${p.id} failed`}>
                        Mark failed
                      </ActionButton>
                    )}
                    {p.status === "paid" && (
                      <ActionButton
                        variant="secondary"
                        run={() => putPayment(p.id, "refunded")}
                        done={payments.reload}
                        confirm={`Refund ${money(p.amount)} on order ${p.order_id}?`}
                        label={`Refund payment ${p.id}`}
                      >
                        Refund
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

/** Reservations, the walk-in queue and the tables (admin, cashier, staff). */
export function DiningRoom() {
  const tables = useApi<DiningTable[]>("/tables");
  return (
    <>
      <ReservationsSection tables={tables.data ?? []} />
      <QueueSection />
      <TablesSection tables={tables} />
    </>
  );
}

const putReservation = (id: number, status: "seated" | "cancelled") => api(`/reservations/${id}/status`, { method: "PUT", json: { status } });

function ReservationsSection({ tables }: { tables: DiningTable[] }) {
  const [day, setDay] = useState(venueToday);
  // reservation_time is the venue's wall clock, so the day's bounds are plain local strings
  const reservations = useApi<Reservation[]>(day ? `/reservations?from=${day}T00:00:00&to=${day}T23:59:59&limit=200` : "/reservations?limit=200");
  const tableName = new Map(tables.map((t) => [t.id, t.name]));

  return (
    <Section id="reservations" title="Reservations" state={reservations}>
      <label className={`field ${styles.filter}`}>
        Day
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      </label>
      <p className="t-small muted">Clear the date to see every booking, newest first.</p>
      <Loaded state={reservations} empty={day ? "No bookings on this day." : "No bookings yet."}>
        {(list) => (
          <Table caption={day ? `Bookings on ${day}, earliest first` : "Every booking, newest first"} cols={["Time", "Name", "Phone", "Guests", "Table", "Status", "Note", "Action"]} num={[0, 3]}>
            {(day ? [...list].reverse() : list).map((r) => (
              <tr key={r.id}>
                <td className={styles.num}>{wallClock(r.reservation_time)}</td>
                <td>{r.customer_name}</td>
                <td><a className={styles.inlineLink} href={`tel:${r.customer_phone}`}>{r.customer_phone}</a></td>
                <td className={styles.num}>{r.party_size}</td>
                <td>{r.table_id ? tableName.get(r.table_id) ?? `Table ${r.table_id}` : "None"}</td>
                <td><StatusText value={r.status} attention={r.status === "booked"} /></td>
                <td>{r.note ?? ""}</td>
                <td>
                  <div className={styles.inline}>
                    {r.status === "booked" && (
                      <>
                        <ActionButton run={() => putReservation(r.id, "seated")} done={reservations.reload} label={`Seat ${r.customer_name}`}>Seat</ActionButton>
                        <ActionButton
                          variant="secondary"
                          run={() => putReservation(r.id, "cancelled")}
                          done={reservations.reload}
                          confirm={`Cancel the booking for ${r.customer_name}?`}
                          label={`Cancel the booking for ${r.customer_name}`}
                        >
                          Cancel
                        </ActionButton>
                      </>
                    )}
                    {r.status === "seated" && (
                      <ActionButton
                        run={() => api(`/reservations/${r.id}/complete`, { method: "POST" })}
                        done={reservations.reload}
                        label={`Complete the booking for ${r.customer_name}`}
                      >
                        Complete
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}

const putQueue = (id: number, status: "called" | "cancelled") => api(`/queue/${id}/status`, { method: "PUT", json: { status } });

function QueueSection() {
  const queue = useApi<QueueEntry[]>("/queue?limit=200", POLL_MS);
  const active = (queue.data ?? []).filter((q) => q.status === "waiting" || q.status === "called").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const waiting = active.filter((q) => q.status === "waiting").length;

  return (
    <Section id="queue" title="Walk-in queue" state={queue}>
      <div className={styles.inline}>
        <ActionButton run={() => api("/queue/next/call", { method: "POST" })} done={queue.reload} disabled={waiting === 0} pending="Calling…">
          Call next
        </ActionButton>
        <p className="t-small muted">{waiting === 1 ? "1 party waiting." : `${waiting} parties waiting.`}</p>
      </div>
      <Loaded state={queue}>
        {() =>
          active.length === 0 ? (
            <p className="muted">Nobody is waiting.</p>
          ) : (
            <Table caption="Parties waiting or called, first come first" cols={["Position", "Name", "Phone", "Guests", "Joined", "Quoted wait", "Status", "Action"]} num={[0, 3, 4, 5]}>
              {active.map((q, i) => (
                <tr key={q.id}>
                  <td className={styles.num}>{i + 1}</td>
                  <td>{q.customer_name}</td>
                  <td>{q.customer_phone ? <a className={styles.inlineLink} href={`tel:${q.customer_phone}`}>{q.customer_phone}</a> : "None"}</td>
                  <td className={styles.num}>{q.party_size}</td>
                  <td className={styles.num}>{stamp(q.created_at)}</td>
                  <td className={styles.num}>{q.wait_minutes} min</td>
                  <td><StatusText value={q.status} attention={q.status === "called"} /></td>
                  <td>
                    <div className={styles.inline}>
                      {q.status === "waiting" ? (
                        <ActionButton run={() => putQueue(q.id, "called")} done={queue.reload} label={`Call ${q.customer_name}`}>Call</ActionButton>
                      ) : (
                        <ActionButton run={() => api(`/queue/${q.id}/seat`, { method: "POST" })} done={queue.reload} label={`Seat ${q.customer_name}`}>Seat</ActionButton>
                      )}
                      <ActionButton
                        variant="secondary"
                        run={() => putQueue(q.id, "cancelled")}
                        done={queue.reload}
                        confirm={`Take ${q.customer_name} off the queue?`}
                        label={`Take ${q.customer_name} off the queue`}
                      >
                        Remove
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )
        }
      </Loaded>
    </Section>
  );
}

function TablesSection({ tables }: { tables: ApiState<DiningTable[]> }) {
  const role = useRole();
  return (
    <Section id="tables" title="Tables" state={tables}>
      {role === "admin" && (
        <AddPanel label="Add a table">
          <EntityForm
            fields={[
              { name: "name", label: "Name", required: true, maxLength: 40 },
              { name: "capacity", label: "Seats", type: "number", required: true, min: 1, max: 20, step: "1" },
              {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: [
                  { value: "available", label: "Available for booking" },
                  { value: "unavailable", label: "Not bookable" },
                ],
                value: "available",
              },
            ]}
            submit={(v) => api("/tables", { method: "POST", json: { name: v.name.trim(), capacity: Number(v.capacity), status: v.status } })}
            done={tables.reload}
            submitLabel="Add table"
            ok="Table added."
          />
        </AddPanel>
      )}
      <Loaded state={tables} empty="No tables set up.">
        {(list) => (
          <Table caption="Tables by size" cols={["Table", "Seats", "Status"]} num={[1]}>
            {list.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td className={styles.num}>{t.capacity}</td>
                <td><StatusText value={t.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Loaded>
    </Section>
  );
}
