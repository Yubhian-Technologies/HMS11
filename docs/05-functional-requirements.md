# 05 — Functional Requirements

Numbered, testable requirements grouped by module. IDs are stable references used in
[17-module-breakdown.md](./17-module-breakdown.md) and future test plans.

## FR-1 · Authentication & Access
- FR-1.1 Staff accounts are provisioned only by an authorized role (Super Admin
  creates Admins; Admin creates Office/Reception/Doctor/Pharmacy/Lab) — no public
  staff signup.
- FR-1.2 Patients may self-register via the web portal.
- FR-1.3 Every authenticated session resolves to exactly one role, one `hospitalId`
  (except Super Admin), and one `branchId` (except Super Admin/Admin), carried as
  Firebase custom claims.
- FR-1.4 A disabled user (status ≠ active) cannot authenticate, even with valid
  credentials.

## FR-2 · Hospital & Branch Management (Super Admin)
- FR-2.1 Super Admin can create, edit, and disable a Hospital.
- FR-2.2 Creating a Hospital automatically creates a default "Main Branch."
- FR-2.3 Super Admin can add/edit/disable additional Branches under a Hospital.
- FR-2.4 Super Admin can assign (and reassign) a Hospital Admin.
- FR-2.5 Super Admin can view platform-wide analytics across all hospitals.
- FR-2.6 Disabling a Hospital immediately blocks login for all its staff and
  patients' visibility into that hospital's data, without deleting any records.

## FR-3 · Staff & Department Management (Admin)
- FR-3.1 Admin can create/edit/disable Doctor, Office, Reception, Pharmacy, and
  Laboratory accounts, each pinned to one Branch.
- FR-3.2 Admin can create/edit/disable Departments and assign Doctors to them.
- FR-3.3 Admin can configure per-doctor consultation fees.
- FR-3.4 Admin can configure Hospital Timings and a Holiday calendar per Branch.
- FR-3.5 Admin can manage the Room/Ward/Bed catalog per Branch.
- FR-3.6 Admin can manage the Lab Test Master (test catalog + price) and the
  Medicine Inventory catalog, per Branch.

## FR-4 · Doctor Availability & Slot Management
- FR-4.1 Doctor (or Admin, delegated) defines a recurring weekly availability
  template (days, hours, slot duration, breaks).
- FR-4.2 The system automatically generates slots for the next rolling 3-day window
  nightly, from active templates and the holiday calendar.
- FR-4.3 Generated slots start in `pendingApproval` status and are not visible to
  patients until approved.
- FR-4.4 Doctor can approve, reject, or manually adjust generated slots.
- FR-4.5 Office can manually block a slot or add a one-off slot outside the template.

## FR-5 · Patient Management
- FR-5.1 Patient registration captures: name, age, gender, DOB, phone, email,
  address, blood group, emergency contact, medical history, current medications,
  allergies, insurance (optional).
- FR-5.2 Reception can create a patient record on behalf of a walk-in patient without
  requiring the patient to self-register.
- FR-5.3 A patient's profile data is editable by the patient (self) and by Reception/
  Admin of a hospital the patient has an active or past relationship with.

## FR-6 · Appointment Management
- FR-6.1 Patient can book any approved, unbooked slot for a doctor.
- FR-6.2 Reception can book an appointment directly on behalf of a patient.
- FR-6.3 Office can approve, reject, or reschedule a pending appointment.
- FR-6.4 Office can view the daily schedule across all doctors in their branch.
- FR-6.5 A "waiting list" is maintained for fully booked doctors; when a slot opens
  (cancellation), the next waiting-list patient is notified.

## FR-7 · Emergency Queue
- FR-7.1 Reception/Office can mark a patient as Emergency at any point, independent
  of slot availability.
- FR-7.2 Emergency entries are assigned the highest queue priority automatically.
- FR-7.3 Office and the relevant Doctor receive an immediate notification on
  emergency check-in.

## FR-8 · Reception / Check-in
- FR-8.1 Reception can verify an appointment and generate a visit token.
- FR-8.2 Reception records vitals: weight, height, BMI (auto-calculated from
  weight/height), blood pressure, pulse, sugar, temperature, SpO2, chief complaint,
  notes.
- FR-8.3 Recorded vitals are visible to the assigned Doctor in real time (no manual
  refresh/handoff step required).

## FR-9 · Consultation
- FR-9.1 Doctor can view the patient's full history: prior consultations,
  prescriptions, lab reports, allergies, medical history, current medications.
- FR-9.2 Doctor can record diagnosis and clinical notes against the current
  appointment.
- FR-9.3 Doctor can write a prescription (one or more medicine line items: name,
  dosage, frequency, duration, instructions).
- FR-9.4 Doctor can order one or more lab tests from the Lab Test Master.
- FR-9.5 Doctor can recommend admission and assign an available bed.
- FR-9.6 Doctor can schedule a follow-up appointment.
- FR-9.7 Doctor can issue a medical certificate (generated document).
- FR-9.8 Doctor can refer the patient to another doctor/department.

## FR-10 · Laboratory
- FR-10.1 Lab receives ordered tests in a `Pending` state.
- FR-10.2 Lab progresses an order through `Sample Collected` → `Processing` →
  `Completed` → `Verified` → `Report Uploaded`; transitions are sequential (no
  skipping stages).
- FR-10.3 Uploading a report notifies both the ordering Doctor and the Patient.

## FR-11 · Pharmacy
- FR-11.1 Pharmacy receives prescriptions with full line-item detail.
- FR-11.2 Pharmacy can mark each medicine line item as dispensed, decrementing
  inventory stock.
- FR-11.3 Dispensing a medicine automatically schedules reminder notifications for
  the patient based on frequency/duration.
- FR-11.4 Pharmacy can view and adjust Medicine Inventory (stock level, batch,
  expiry).

## FR-12 · Room / Bed / Admission Management
- FR-12.1 Admin manages Wards, Rooms, and Beds per Branch; each Bed has a status:
  Available, Occupied, Reserved, Cleaning, Maintenance.
- FR-12.2 Doctor can assign an Available bed at admission time, flipping it to
  Occupied.
- FR-12.3 Discharging a patient requires the attending Doctor to complete a
  structured Discharge Summary before the bed can return to Available.

## FR-13 · Patient Timeline / EMR
- FR-13.1 Every patient has a single chronological timeline aggregating
  appointments, vitals, consultations, prescriptions, lab reports, admissions,
  discharge summaries, follow-ups, and medicine compliance.
- FR-13.2 No timeline entry is ever hard-deleted; corrections are new entries
  referencing the original.

## FR-14 · Recovery Tracking
- FR-14.1 Patient can mark each scheduled medicine dose as Taken, Missed, or Skipped.
- FR-14.2 Patient can submit a daily health update: condition (Better/Same/Worse),
  pain level, sugar, BP, temperature, weight.
- FR-14.3 Doctor can view a patient's compliance and recovery trend on the timeline.

## FR-15 · Billing
- FR-15.1 An invoice is generated per appointment/admission, aggregating
  consultation, lab, pharmacy, and room charges as line items.
- FR-15.2 Reception/Admin can record a payment (cash/card/UPI, manual entry) against
  an invoice.
- FR-15.3 Invoice tracks payment status: unpaid, partial, paid.
- FR-15.4 Admin can view outstanding dues across the hospital/branch.

## FR-16 · Notifications
- FR-16.1 The system sends an FCM notification for: appointment confirmation,
  appointment reminder, medicine reminder, lab report ready, prescription ready,
  follow-up reminder, emergency updates.
- FR-16.2 Users can view a notification history/inbox in-app.

## FR-17 · Feedback
- FR-17.1 Patient can submit a rating (1–5) and comment after a completed visit.
- FR-17.2 Marking feedback as a complaint routes it to Admin with a resolution
  status: open, acknowledged, resolved.

## FR-18 · Audit & Activity Logs
- FR-18.1 Every create/update/status-change on a clinical or administrative
  collection is recorded in an immutable audit log entry: actor, role, action,
  entity type/id, before/after snapshot, timestamp.
- FR-18.2 Admin/Super Admin can view audit logs scoped to their hospital/platform
  respectively.

## FR-19 · Analytics
- FR-19.1 Super Admin dashboard shows platform-wide metrics: hospital count, active
  users, appointment volume, growth trend.
- FR-19.2 Admin dashboard shows hospital-scoped metrics: appointments, revenue
  (from invoices), doctor utilization, bed occupancy.
