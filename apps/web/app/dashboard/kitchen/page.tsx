import type { Metadata } from "next";
import { KitchenDashboard } from "@/components/dashboard/dashboards";

export const metadata: Metadata = { title: "Kitchen", description: "The kitchen's live order queue, stock, recipes and alerts." };

export default function Page() {
  return <KitchenDashboard />;
}
