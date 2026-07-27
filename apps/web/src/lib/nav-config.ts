import type { Role } from "@hms/shared";

type NavItem = {
  label: string;
  /** Omitted for items pending a future module — rendered as inert text (docs/18-development-roadmap.md). */
  href?: string;
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

// docs/16-navigation-flow.md §16.2 — sidebar items per role.
export const NAV_ITEMS: Record<Role, NavItem[]> = {
  super_admin: [
    { label: "Hospitals", href: "/super-admin" },
    { label: "Analytics", href: "/super-admin/analytics" },
    { label: "Audit Logs", href: "/super-admin/audit-logs" },
    { label: "Platform Settings" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin" },
    { label: "Staff", href: "/admin/staff" },
    { label: "Departments", href: "/admin/departments" },
    { label: "Rooms & Beds", href: "/admin/rooms-beds" },
    { label: "Lab Test Master", href: "/admin/lab-tests" },
    { label: "Medicine Inventory", href: "/admin/medicine-inventory" },
    { label: "Settings", href: "/admin/settings" },
    { label: "Billing Overview", href: "/admin/billing" },
    { label: "Audit Logs", href: "/admin/audit-logs" },
    { label: "Analytics", href: "/admin/analytics" },
  ],
  office: [
    { label: "Slot Approval", href: "/office/slots" },
    { label: "Appointments", href: "/office/appointments" },
    { label: "Emergency Queue", href: "/office/appointments?tab=emergency" },
    { label: "Daily Schedule", href: "/office/daily-schedule" },
    { label: "Waiting List", href: "/office/waiting-list" },
    { label: "Room Assignment", href: "/office/room-assignment" },
    { label: "Doctor Availability", href: "/office/doctor-availability" },
    { label: "Lab Payments", href: "/office/lab-payments" },
  ],
  reception: [
    // Check-in and Vitals are the same page (its two cards) — one nav entry,
    // not two identical hrefs. Two items sharing a href both satisfy
    // `item.href === activeHref` in DashboardShell, so both would light up
    // together no matter which one was clicked; that's the actual bug.
    { label: "Check-in & Vitals", href: "/reception" },
    { label: "Walk-in Booking", href: "/reception/book" },
    { label: "Billing", href: "/reception/billing" },
  ],
  doctor: [
    { label: "Queue", href: "/doctor" },
    { label: "My Availability", href: "/doctor/availability" },
    { label: "My Patients" },
    { label: "Admissions", href: "/doctor/admissions" },
    { label: "Rooms & Beds", href: "/doctor/rooms" },
    { label: "Labs", href: "/doctor/labs" },
  ],
  pharmacy: [
    { label: "Prescription Queue", href: "/pharmacy" },
    { label: "Inventory", href: "/pharmacy/inventory" },
  ],
  lab: [
    { label: "Order Pipeline", href: "/lab" },
    { label: "Test Master" },
  ],
  patient: [
    { label: "Home", href: "/patient" },
    { label: "Book Appointment", href: "/patient/book" },
    { label: "Appointments", href: "/patient/appointments" },
    { label: "Timeline", href: "/patient/timeline" },
    { label: "Prescriptions", href: "/patient/prescriptions" },
    { label: "Reports", href: "/patient/reports" },
    { label: "Recovery Tracking", href: "/patient/recovery" },
    { label: "Notifications", href: "/notifications" },
    { label: "Feedback", href: "/patient/feedback" },
  ],
  // Reserved role, no Phase 1 UI/permissions (docs/07-user-roles.md).
  nurse: [],
};
