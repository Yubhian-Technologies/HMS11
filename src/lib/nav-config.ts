import type { Role } from "@hms/shared";
import {
  Activity,
  Bell,
  BarChart3,
  BedDouble,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Home,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  MessageSquare,
  Network,
  Pill,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Siren,
  Stethoscope,
  TestTubes,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  /** Omitted for items pending a future module — rendered as inert text (docs/18-development-roadmap.md). */
  href?: string;
  icon: LucideIcon;
};

// docs/16-navigation-flow.md §16.2
export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  office: "Front Office",
  reception: "Reception",
  doctor: "Doctor",
  pharmacy: "Pharmacy",
  lab: "Laboratory",
  patient: "Patient",
  nurse: "Nurse",
};

/** Icon shown in the sidebar branding lockup for the active role. */
export const ROLE_ICON: Record<Role, LucideIcon> = {
  super_admin: ShieldCheck,
  admin: Building2,
  office: ClipboardList,
  reception: UserPlus,
  doctor: Stethoscope,
  pharmacy: Pill,
  lab: FlaskConical,
  patient: User,
  nurse: HeartPulse,
};

// docs/16-navigation-flow.md §16.2 — sidebar items per role.
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  super_admin: [
    { label: "Hospitals", href: "/super-admin", icon: Building2 },
    { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
    { label: "Audit Logs", href: "/super-admin/audit-logs", icon: ScrollText },
    { label: "Platform Settings", icon: Settings },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Staff", href: "/admin/staff", icon: Users },
    { label: "Departments", href: "/admin/departments", icon: Network },
    { label: "Rooms & Beds", href: "/admin/rooms-beds", icon: BedDouble },
    { label: "Lab Test Master", href: "/admin/lab-tests", icon: FlaskConical },
    { label: "Medicine Inventory", href: "/admin/medicine-inventory", icon: Pill },
    { label: "Settings", href: "/admin/settings", icon: Settings },
    { label: "Billing Overview", href: "/admin/billing", icon: Receipt },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  ],
  office: [
    { label: "Slot Approval", href: "/office/slots", icon: CalendarClock },
    { label: "Appointments", href: "/office/appointments", icon: CalendarCheck },
    { label: "Emergency Queue", href: "/office/appointments?tab=emergency", icon: Siren },
    { label: "Daily Schedule", href: "/office/daily-schedule", icon: CalendarDays },
    { label: "Waiting List", href: "/office/waiting-list", icon: ListOrdered },
    { label: "Room Assignment", href: "/office/room-assignment", icon: BedDouble },
    { label: "Lab Payments", href: "/office/lab-payments", icon: Receipt },
  ],
  reception: [
    { label: "Walk-in Booking", href: "/reception/book", icon: UserPlus },
    { label: "Billing", href: "/reception/billing", icon: Receipt },
  ],
  doctor: [
    { label: "Queue", href: "/doctor", icon: ListOrdered },
    { label: "My Availability", href: "/doctor/availability", icon: CalendarClock },
    { label: "My Patients", icon: Users },
    { label: "Admissions", href: "/doctor/admissions", icon: BedDouble },
    { label: "Rooms & Beds", href: "/doctor/rooms", icon: BedDouble },
    { label: "Labs", href: "/doctor/labs", icon: FlaskConical },
  ],
  pharmacy: [
    { label: "Prescription Queue", href: "/pharmacy", icon: ClipboardList },
    { label: "Inventory", href: "/pharmacy/inventory", icon: Boxes },
  ],
  lab: [
    { label: "Order Pipeline", href: "/lab", icon: TestTubes },
    { label: "Test Master", icon: ListChecks },
  ],
  patient: [
    { label: "Home", href: "/patient", icon: Home },
    { label: "Book Appointment", href: "/patient/book", icon: CalendarPlus },
    { label: "Appointments", href: "/patient/appointments", icon: CalendarCheck },
    { label: "Timeline", href: "/patient/timeline", icon: History },
    { label: "Prescriptions", href: "/patient/prescriptions", icon: Pill },
    { label: "Reports", href: "/patient/reports", icon: FileText },
    { label: "Recovery Tracking", href: "/patient/recovery", icon: Activity },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Feedback", href: "/patient/feedback", icon: MessageSquare },
  ],
  nurse: [
    { label: "Vitals Queue", href: "/nurse", icon: Activity },
    { label: "Ward Care", href: "/nurse/ward-care", icon: BedDouble },
  ],
};
