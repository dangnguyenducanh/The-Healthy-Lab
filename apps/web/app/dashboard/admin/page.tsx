import type { Metadata } from "next";
import { AdminDashboard } from "@/components/dashboard/dashboards";

export const metadata: Metadata = { title: "Admin", description: "Orders, menu, accounts, staff, vouchers and stock at The Healthy Lab." };

export default function Page() {
  return <AdminDashboard />;
}
