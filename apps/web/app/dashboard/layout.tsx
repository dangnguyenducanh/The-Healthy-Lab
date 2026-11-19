import type { Metadata } from "next";
import { Shell } from "@/components/dashboard/Shell";

// The staff app sits outside the (site) group: no public nav or footer. Shell guards by role on the
// client; the API checks every call on the server.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
