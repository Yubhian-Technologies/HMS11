# 15 — UI Wireframes (low-fidelity layout descriptions)

Text wireframes for the primary screen of each dashboard — enough to brief
implementation, not full visual design. All dashboards share a common shell (see
[16-navigation-flow.md](./16-navigation-flow.md)): left sidebar nav (collapsible),
top bar (hospital/branch switcher where applicable, notification bell, user menu),
main content area. Every list view below implies loading/empty/error states per
NFR-6.2.

## Super Admin — Hospitals

```
┌ Sidebar ─┐ ┌ Top bar: [notif] [Super Admin ▾] ───────────────┐
│ Hospitals│ │ Hospitals                          [+ New Hospital]│
│ Analytics│ ├──────────────────────────────────────────────────┤
│ Settings │ │ [search] [status filter]                          │
│          │ │ ┌────────────────────────────────────────────┐   │
│          │ │ │ Name │ Branches │ Admin │ Status │ Actions  │   │
│          │ │ │ ...rows...                                  │   │
│          │ │ └────────────────────────────────────────────┘   │
└──────────┘ └──────────────────────────────────────────────────┘
```
Row action → Hospital detail: branches list, assigned admin, disable toggle, usage
stats sparkline.

## Admin — Hospital Dashboard (home)

KPI cards row (today's appointments, active doctors, bed occupancy %, outstanding
dues) → two-column below: "Today's schedule across branches" table + "Recent audit
activity" feed.

## Admin — Staff Management

Tabs: Doctors | Office | Reception | Pharmacy | Lab. Each tab: table (name, branch,
department [doctors], status) + "+ New" opening a side-sheet form. Doctor rows expand
to show department/consultation fee/availability template link.

## Doctor — My Availability

Weekly recurring template editor (per weekday: on/off, start/end time, slot duration,
breaks) at top. Below, the rolling 3-day slot list grouped by date, each slot a chip
colored by status (pendingApproval = amber, approved = green, blocked = gray) with a
"Bulk-approve this day" action (FR-4.4 — approval is the doctor's own, not Office's).

## Office — Slot Approval

Kanban-style by date (Today / Tomorrow / Day 3), columns of doctor cards; each card
lists its slots as the same status-colored chips, read-only for approval state.
Office's own actions here are narrower than the page name implies (FR-4.5, doc
08-permission-matrix.md "Doctor slots" row): block an existing slot, or add a one-off
slot outside the doctor's template — never approve/reject, which stays with the
doctor.

## Office — Appointment Queue

Table grouped by status tabs (Pending / Approved / Emergency). Emergency tab is
visually distinct (red accent) and always sorted to top of the overall queue view.
Row actions: Approve / Reject / Reschedule (opens slot picker).

## Reception — Check-in

Search-by-token-or-name → patient card with today's appointment → "Check In" button
→ vitals form (weight/height auto-computing BMI live, BP, pulse, sugar, temp, SpO2,
chief complaint, notes) → "Send to Doctor Queue."

## Doctor — Queue

Left: today's queue list (token, patient name, wait time, priority-flagged emergency
rows pinned to top). Right: selected patient's vitals (from Reception, read-only) +
"Start Consultation" → opens Consultation Workspace.

## Doctor — Consultation Workspace

Three-pane: (1) History rail — collapsible past consultations/prescriptions/reports/
allergies; (2) Center — diagnosis + notes editor, prescription line-item builder; (3)
Right rail — action buttons: Order Lab Test, Recommend Admission (bed picker),
Schedule Follow-up, Issue Certificate, Refer Patient. Single "Complete Consultation"
submit at the bottom (maps to `submitConsultation`, doc 14).

## Pharmacy — Prescription Queue

Table of pending prescriptions (patient, doctor, item count, age). Row → detail view
listing each medicine line item with a "Dispense" toggle per item and a live
inventory-stock indicator per item (red if below reorder level).

## Laboratory — Order Pipeline

Kanban by status column (Pending → Sample Collected → Processing → Completed →
Verified). Card → detail drawer with "Advance Status" button (only the next valid
transition is enabled, per FR-10.2) and, at Completed/Verified, a report file
uploader.

## Patient — Home

Upcoming appointment card (or "Book Appointment" CTA if none) → quick stats
(next medicine reminder, active prescriptions, unread notifications) → recent
timeline preview → "View Full Timeline" link.

## Patient — Book Appointment

Department picker → doctor list (photo, specialization, fee, next available slot) →
calendar strip (3-day window only, matching FR-4) → time-slot grid → confirm.

## Patient — Timeline

Single vertical chronological feed, icon-coded by entry type (appointment/vitals/
consultation/prescription/lab/admission/follow-up/medicine-log), each expandable
in-place — no navigation away for detail (keeps the "never delete, always visible
history" principle tangible in the UI).

## Patient — Recovery Tracking

Today's medicine checklist (Taken/Missed/Skipped per dose) at top; below, a "Log
today's update" card (condition selector + optional vitals) and a trend sparkline of
recent daily updates.
