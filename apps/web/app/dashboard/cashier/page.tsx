import type { Metadata } from "next";
import { CashierDashboard } from "@/components/dashboard/dashboards";

export const metadata: Metadata = { title: "Cashier", description: "Payments, today's bookings, the walk-in queue and tables." };

export default function Page() {
  return <CashierDashboard />;
}
