import { WEEKDAYS, type Weekday } from "@hms/shared";

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** JS getUTCDay() is 0=Sunday..6=Saturday; WEEKDAYS starts at Monday. */
export function weekdayOf(isoDate: string): Weekday {
  const jsDay = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return WEEKDAYS[(jsDay + 6) % 7]!;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function overlapsAnyBreak(
  startMin: number,
  endMin: number,
  breaks: { start: string; end: string }[],
): boolean {
  return breaks.some((b) => startMin < toMinutes(b.end) && endMin > toMinutes(b.start));
}
