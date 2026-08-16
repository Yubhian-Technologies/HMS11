import { redirect } from "next/navigation";

/**
 * Office validates attendance now (check-in moved to /office/appointments) —
 * Reception's own job is walk-in registration/booking, so that's the
 * front desk's landing page.
 */
export default function ReceptionPage() {
  redirect("/reception/book");
}
