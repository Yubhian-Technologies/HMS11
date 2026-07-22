# 16 — Navigation Flow

## 16.1 Shell & routing

`proxy.ts` + `requireRole()` (see doc 11 rule 3) resolve the session's custom claims on every request and enforce
the route-group ↔ role mapping from [11-folder-structure.md](./11-folder-structure.md)
before any page renders:

```
/                       → redirect to /login (unauthenticated) or role home (authenticated)
/login                  → (auth) route group — all roles
/signup                 → (auth) route group — patient self-registration only

/super-admin/*          → app/super-admin/  — role: super_admin only
/admin/*                → app/admin/        — role: admin only
/office/*               → app/office/       — role: office only
/reception/*            → app/reception/    — role: reception only
/doctor/*               → app/doctor/       — role: doctor only
/pharmacy/*             → app/pharmacy/     — role: pharmacy only
/lab/*                   → app/lab/         — role: lab only
/patient/*               → app/patient/     — role: patient only
```

Any authenticated user hitting a route group that doesn't match their role claim is
redirected to their own role home, not shown a 403 page — reduces confusion for
staff who mistype a URL.

## 16.2 Per-role primary navigation

| Role | Sidebar items |
|---|---|
| Super Admin | Hospitals · Analytics · Platform Settings |
| Admin | Dashboard · Staff · Departments · Rooms & Beds · Lab Test Master · Medicine Inventory · Settings (timings/holidays) · Billing Overview · Audit Logs · Analytics |
| Office | Slot Approval · Appointments · Emergency Queue · Daily Schedule · Waiting List |
| Reception | Check-in · Vitals · Walk-in Booking · Billing (record payment) |
| Doctor | Queue · My Availability · Consultation Workspace (contextual, not a nav item) · My Patients · Admissions |
| Pharmacy | Prescription Queue · Inventory |
| Laboratory | Order Pipeline · Test Master (read-only) |
| Patient | Home · Book Appointment · Appointments · Timeline · Prescriptions · Reports · Recovery Tracking · Notifications · Feedback |

## 16.3 Cross-role handoff points (where a workflow step changes which role is
looking at the screen)

```
Office approves slot ──> visible on Patient's booking screen
Patient/Reception books ──> appears on Office's Appointments queue
Office approves appt ──> appears on Reception's Check-in list (that date)
Reception checks in + records vitals ──> appears on Doctor's Queue (real-time)
Doctor orders lab test ──> appears on Lab's Order Pipeline (Pending column)
Lab uploads report ──> appears on Doctor's patient history + Patient's Reports
Doctor writes prescription ──> appears on Pharmacy's Prescription Queue
Pharmacy dispenses ──> Patient's Recovery Tracking checklist populates
Doctor assigns bed ──> Admin's Rooms & Beds board updates (Occupied)
Doctor discharges ──> bed board updates (Available), Patient's Timeline gets discharge summary
Visit completed ──> Patient's Feedback prompt becomes available; Invoice appears on Reception/Admin Billing
```

Each handoff is a Firestore listener on the receiving side (doc 14 §14.3), not a
polling refresh or a manual "sync" action.

## 16.4 Notification-driven navigation

Tapping a notification (doc 13.3 dispatch list) deep-links directly to the relevant
detail screen for the recipient's role (e.g., a "lab report ready" notification opens
the Patient's Timeline scrolled to that report, or the Doctor's patient history at the
same entry) — notifications are never dead-ends to a generic inbox only.
