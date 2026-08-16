import "server-only";
import { getAdminDb } from "@/server/firebase-admin";
import type { DailyStats } from "@hms/shared";

export interface TrendPoint {
  date: string;
  appointments: number;
  revenue: number;
}

export interface PlatformAnalytics {
  hospitalCount: number;
  activeUserCount: number;
  appointmentVolume7d: number;
  trend: TrendPoint[];
}

export interface HospitalAnalytics {
  appointments7d: number;
  completedAppointments7d: number;
  revenue7d: number;
  /** null when no slots were approved in the window — nothing to divide by (FR-19.2). */
  doctorUtilizationRate: number | null;
  /** Snapshot from the most recent rolled-up day, not summed across the window. */
  bedOccupancyRate: number | null;
  trend: TrendPoint[];
}

function sevenDaysAgoIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 6); // inclusive of today = 7 days
  return d.toISOString().slice(0, 10);
}

function toTrend(docs: DailyStats[]): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>();
  for (const doc of docs) {
    const existing = byDate.get(doc.date) ?? { date: doc.date, appointments: 0, revenue: 0 };
    existing.appointments += doc.appointmentsCount;
    existing.revenue += doc.revenue;
    byDate.set(doc.date, existing);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getPlatformAnalytics(): Promise<PlatformAnalytics> {
  const db = getAdminDb();
  const startDate = sevenDaysAgoIso();

  const [hospitalCountSnap, activeUserCountSnap, statsSnap] = await Promise.all([
    db.collection("hospitals").where("status", "==", "active").count().get(),
    db.collection("users").where("status", "==", "active").count().get(),
    db.collectionGroup("dailyStats").where("date", ">=", startDate).get(),
  ]);

  const stats = statsSnap.docs.map((doc) => doc.data() as DailyStats);
  return {
    hospitalCount: hospitalCountSnap.data().count,
    activeUserCount: activeUserCountSnap.data().count,
    appointmentVolume7d: stats.reduce((sum, s) => sum + s.appointmentsCount, 0),
    trend: toTrend(stats),
  };
}

export async function getHospitalAnalytics(hospitalId: string): Promise<HospitalAnalytics> {
  const db = getAdminDb();
  const startDate = sevenDaysAgoIso();

  const statsSnap = await db
    .collectionGroup("dailyStats")
    .where("hospitalId", "==", hospitalId)
    .where("date", ">=", startDate)
    .orderBy("date", "asc")
    .get();

  const stats = statsSnap.docs.map((doc) => doc.data() as DailyStats);
  const completedAppointments7d = stats.reduce((sum, s) => sum + s.completedAppointmentsCount, 0);
  const approvedSlots7d = stats.reduce((sum, s) => sum + s.approvedSlotsCount, 0);
  const latest = stats.at(-1);

  return {
    appointments7d: stats.reduce((sum, s) => sum + s.appointmentsCount, 0),
    completedAppointments7d,
    revenue7d: stats.reduce((sum, s) => sum + s.revenue, 0),
    doctorUtilizationRate: approvedSlots7d > 0 ? completedAppointments7d / approvedSlots7d : null,
    bedOccupancyRate: latest && latest.totalBedsCount > 0 ? latest.occupiedBedsCount / latest.totalBedsCount : null,
    trend: toTrend(stats),
  };
}
