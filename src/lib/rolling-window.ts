/**
 * FR-4.2 / docs/13-cloud-functions.md: doctorSlots are materialized for a
 * constant 3-day rolling window (today + next 2 days). This mirrors that
 * window for the UI; the authoritative per-hospital-timezone generation
 * itself lives in functions/src/scheduled/generateRollingSlots.ts.
 */
const WINDOW_DAYS = 3;

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date, as the browser/server process's local calendar day. */
export function todayIsoClient(): string {
  return isoDate(new Date());
}

/** The 3-day rolling window as ISO date strings, starting today. */
export function rollingWindowDates(): string[] {
  const base = new Date();
  return Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return isoDate(d);
  });
}

/** `index` is this date's position in rollingWindowDates()'s output. */
export function formatDateLabel(dateIso: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";

  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
