// Every fact about the place, written once. Assumed facts (no real ones given): see docs/PLAN.md.
export const SITE = {
  name: "The Healthy Lab",
  street: "Williamson Plaza",
  district: "Maggieberg",
  timeZone: "America/Denver",
  email: "hello@thehealthylab.example",
  description: "Healthy kitchen on Williamson Plaza, Maggieberg: bowls, wraps, salads and cold-pressed juice to eat in, collect or have delivered.",
} as const;

export const MAP_URL = `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${SITE.street} ${SITE.district}`)}`;

export type HoursRow = { label: string; days: number[]; open?: string; close?: string };

// days: 0 Sunday … 6 Saturday, in the venue's time zone
export const HOURS: HoursRow[] = [
  { label: "Mon to Fri", days: [1, 2, 3, 4, 5], open: "08:00", close: "22:00" },
  { label: "Sat", days: [6], open: "10:00", close: "16:00" },
  { label: "Sun", days: [0] },
];

export const MAIN_ACTION = { label: "Order online", href: "/menu" } as const;

export const DASHBOARD_FOR_ROLE: Record<string, string> = {
  admin: "/dashboard/admin",
  chef: "/dashboard/kitchen",
  cashier: "/dashboard/cashier",
  delivery: "/dashboard/delivery",
  staff: "/dashboard/staff",
};
