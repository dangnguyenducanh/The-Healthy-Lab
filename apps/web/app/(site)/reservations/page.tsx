import { Closing } from "@/components/site/Closing";
import { ReservationsView } from "./ReservationsView";

export const metadata = { title: "Reservations" };

export default function ReservationsPage() {
  return (
    <>
      <main id="main">
        <ReservationsView />
      </main>
      <Closing />
    </>
  );
}
