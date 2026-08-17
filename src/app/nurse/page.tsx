import { redirect } from "next/navigation";

/**
 * Vitals capture moved back to Reception (together with check-in) —
 * Nurse's remaining job is ward-care during an admission, so that's the
 * landing page now.
 */
export default function NursePage() {
  redirect("/nurse/ward-care");
}
