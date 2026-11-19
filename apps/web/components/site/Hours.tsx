"use client";

import { useEffect, useState } from "react";
import { HOURS, SITE } from "@/lib/site";

// "Now" in the venue's time zone, never the visitor's clock.
function venueNow(): { day: number; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: SITE.timeZone })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { day, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function openNowText(): string {
  const { day, minutes } = venueNow();
  const today = HOURS.find((r) => r.days.includes(day));
  if (today?.open && today.close && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    return `Open now, until ${today.close}`;
  }
  for (let k = 0; k < 8; k++) {
    const d = (day + k) % 7;
    const row = HOURS.find((r) => r.days.includes(d));
    if (!row?.open || (k === 0 && minutes >= toMinutes(row.open))) continue;
    return `Closed, opens ${k === 0 ? "today" : k === 1 ? "tomorrow" : DAY[d]} at ${row.open}`;
  }
  return "";
}

export function Hours() {
  const [today, setToday] = useState<number | null>(null);
  // The venue's clock is read in the browser after hydration, never on the server.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setToday(venueNow().day), []);
  return (
    <dl className="hours">
      {HOURS.map((row) => {
        const isToday = today !== null && row.days.includes(today);
        return [
          <dt key={`${row.label}-t`} className={isToday ? "is-today" : undefined}>{row.label}</dt>,
          <dd key={`${row.label}-d`} className={isToday ? "is-today" : undefined}>
            {row.open ? `${row.open} to ${row.close}` : "Closed"}
          </dd>,
        ];
      })}
    </dl>
  );
}

export function OpenNow({ className }: { className?: string }) {
  const [text, setText] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setText(openNowText()), []);
  return <p className={className} aria-live="polite">{text}</p>;
}
