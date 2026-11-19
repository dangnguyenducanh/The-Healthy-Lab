import type { Metadata } from "next";
import { DeliveryDashboard } from "@/components/dashboard/dashboards";

export const metadata: Metadata = { title: "Delivery", description: "Orders ready to go out and on the road." };

export default function Page() {
  return <DeliveryDashboard />;
}
