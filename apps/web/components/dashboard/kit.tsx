"use client";

// The dashboards' few parts: one data hook, one action button, one form, one table, a section.
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SITE } from "@/lib/site";
import type { Role } from "@/lib/types";
import styles from "./dashboard.module.css";

export const errText = (err: unknown) =>
  err instanceof ApiError ? err.message : "Could not reach the server. Check the connection and try again.";

export function useRole(): Role | undefined {
  return useAuth().user?.role;
}

export type ApiState<T> = { data?: T; error?: string; at?: Date; reload: () => Promise<void> };

/** GET `path`; with `poll` (ms) it reloads on that interval while the tab is visible, and on return to it. */
export function useApi<T>(path: string, poll?: number): ApiState<T> {
  const [state, setState] = useState<{ data?: T; error?: string; at?: Date }>({});
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current; // only the newest request may write, so a slow poll never overwrites a fresh result
    try {
      const data = await api<T>(path);
      if (n === seq.current) setState({ data, at: new Date() });
    } catch (err) {
      if (n === seq.current) setState((s) => ({ ...s, error: errText(err) }));
    }
  }, [path]);

  useEffect(() => {
    void load();
    if (!poll) return;
    const tick = () => {
      if (!document.hidden) void load();
    };
    const id = window.setInterval(tick, poll);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load, poll]);

  return { ...state, reload: load };
}

export const POLL_MS = 20_000;

/** A button that runs one API call: disabled and relabelled while pending, the API's error under it. */
export function ActionButton({
  children,
  run,
  done,
  label,
  pending = "Saving…",
  variant = "primary",
  disabled,
  confirm,
}: {
  children: ReactNode;
  run: () => Promise<unknown>;
  done?: () => unknown;
  label?: string;
  pending?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  /** Asked with the browser's confirm dialog before running (cancellations, refunds). */
  confirm?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function click() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError("");
    try {
      await run();
      await done?.();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={styles.action}>
      <button type="button" className={`btn btn--${variant}`} onClick={click} disabled={busy || disabled} aria-label={busy ? undefined : label}>
        {busy ? pending : children}
      </button>
      {error && <span className="form-note" data-tone="error" role="alert">{error}</span>}
    </span>
  );
}

export function Section({ id, title, state, children }: { id: string; title: string; state?: ApiState<unknown>; children: ReactNode }) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.sectionHead}>
        <h2 id={`${id}-title`}>{title}</h2>
        {state && (
          <div className={styles.refresh}>
            {state.at && <span className="t-small muted">Updated {state.at.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })}</span>}
            <ActionButton variant="secondary" run={state.reload} pending="Refreshing…" label={`Refresh ${title.toLowerCase()}`}>
              Refresh
            </ActionButton>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

/** Loading line, error, empty line or the content, for one `useApi` result. */
export function Loaded<T>({ state, empty, children }: { state: ApiState<T>; empty?: string; children: (data: T) => ReactNode }) {
  const { data, error } = state;
  if (data === undefined) {
    return error ? (
      <p className="form-note" data-tone="error" role="alert">{error}</p>
    ) : (
      <p className="t-small muted" role="status">Loading…</p>
    );
  }
  return (
    <>
      {error && <p className="form-note" data-tone="error" role="alert">Could not refresh: {error}</p>}
      {empty && Array.isArray(data) && data.length === 0 ? <p className="muted">{empty}</p> : children(data)}
    </>
  );
}

/** A real table in a scrollable region; `num` lists the column indexes set right-aligned in tabular figures. */
export function Table({ caption, cols, num = [], children }: { caption: string; cols: string[]; num?: number[]; children: ReactNode }) {
  return (
    <div className={styles.tableWrap} role="region" aria-label={caption} tabIndex={0}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={c} scope="col" className={num.includes(i) ? styles.num : undefined}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function StatusText({ value, attention }: { value: string; attention?: boolean }) {
  return <span className={styles.status} data-attention={attention || undefined}>{sentence(value)}</span>;
}

export type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "tel" | "date" | "textarea" | "select" | "checkbox";
  options?: { value: string | number; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
  maxLength?: number;
  value?: string | number | boolean | null;
  full?: boolean;
};
export type Values = Record<string, string>;

/** A form built from a field list; `submit` gets the values as strings, `done` runs after a save. */
export function EntityForm({
  fields,
  submit,
  done,
  submitLabel,
  ok,
  onCancel,
}: {
  fields: Field[];
  submit: (values: Values) => Promise<unknown>;
  done?: () => unknown;
  submitLabel: string;
  ok: string;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as Values;
    setBusy(true);
    setNote(null);
    try {
      await submit(values);
      form.reset();
      setNote({ tone: "ok", text: ok });
      await done?.();
    } catch (err) {
      setNote({ tone: "error", text: errText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`form ${styles.form}`} onSubmit={onSubmit}>
      {fields.map((f) => (
        <FieldInput key={f.name} f={f} />
      ))}
      <div className="btn-row">
        <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" className="btn btn--secondary" onClick={onCancel}>Cancel</button>}
      </div>
      {note && <p className="form-note" data-tone={note.tone} role={note.tone === "error" ? "alert" : "status"}>{note.text}</p>}
    </form>
  );
}

function FieldInput({ f }: { f: Field }) {
  if (f.type === "checkbox") {
    return (
      <label className={styles.check}>
        <input type="checkbox" name={f.name} defaultChecked={Boolean(f.value)} />
        {f.label}
      </label>
    );
  }
  const common = { name: f.name, required: f.required, defaultValue: f.value == null ? undefined : String(f.value) };
  return (
    <label className={`field${f.full || f.type === "textarea" ? " field--full" : ""}`}>
      {f.label}
      {f.type === "textarea" ? (
        <textarea {...common} maxLength={f.maxLength} rows={3} />
      ) : f.type === "select" ? (
        <select {...common}>
          <option value="">{f.required ? "Choose…" : "None"}</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={f.type ?? "text"}
          min={f.min}
          max={f.max}
          step={f.step ?? (f.type === "number" ? "any" : undefined)}
          maxLength={f.maxLength}
          autoComplete="off"
        />
      )}
    </label>
  );
}

/** A disclosure holding a create form, closed until asked for. */
export function AddPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className={styles.add}>
      <summary className="btn btn--secondary">{label}</summary>
      <div className={styles.panel}>{children}</div>
    </details>
  );
}

export function Jump({ items }: { items: [id: string, label: string][] }) {
  return (
    <nav aria-label="On this page" className={styles.jump}>
      <ul>
        {items.map(([id, label]) => (
          <li key={id}><a href={`#${id}`}>{label}</a></li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------- values

export const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).replaceAll("_", " ") : s);
export const text = (v?: string) => v?.trim() || undefined;
export const num = (v?: string) => (v === undefined || v === "" ? undefined : Number(v));
export const qty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

const ZONED = /(?:Z|[+-]\d\d:?\d\d)$/;

/** A server stamp (naive UTC) in the venue's time zone: "Nov 19, 18:30", or the date alone. */
export function stamp(iso?: string | null, withTime = true): string {
  if (!iso) return "None";
  const d = new Date(ZONED.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleString("en-US", {
    timeZone: SITE.timeZone,
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
  });
}

/** A reservation time is the venue's wall clock with no zone: shown as written, whatever the browser's zone. */
export function wallClock(iso: string): string {
  return new Date(`${iso.replace(ZONED, "")}Z`).toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/** Today's date at the venue, YYYY-MM-DD. */
export const venueToday = () => new Date().toLocaleDateString("en-CA", { timeZone: SITE.timeZone });
