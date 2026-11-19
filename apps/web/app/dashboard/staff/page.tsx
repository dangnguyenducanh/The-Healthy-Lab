import type { Metadata } from "next";
import { StaffDashboard } from "@/components/dashboard/dashboards";

export const metadata: Metadata = { title: "Dining room and stock", description: "Bookings, the walk-in queue, tables and stock." };

export default function Page() {
  return <StaffDashboard />;
}
