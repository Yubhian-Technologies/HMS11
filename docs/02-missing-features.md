# 02 — Missing Feature Analysis & Enterprise Additions

Gaps identified against a real-world, production hospital's operational needs, not
present or under-specified in the original spec. Each is scoped for Phase 1 unless
marked otherwise.

## 1. Hospital → Branch hierarchy

**Gap:** every collection requires `branchId`, but "branch" as a concept is never
defined; Admin is described as owning one hospital only.

**Design:** `hospitals/{hospitalId}/branches/{branchId}` subcollection. A hospital
always has at least one branch (created automatically as "Main Branch" when the
hospital is created, so single-location hospitals need no special-casing). Admin
manages all branches of their hospital: creating branches, assigning branch-scoped
staff, and viewing hospital-wide (cross-branch) reports. Office/Reception/Doctor/
Pharmacy/Lab accounts are created against exactly one branch and only see that
branch's queues, slots, and inventory. Super Admin analytics roll up across hospitals
and, within a hospital, across branches.

## 2. Slot generation automation

**Gap:** spec has Office manually typing out every 15-minute slot for the next 3 days,
per doctor, every day. At even 10 doctors × 8 working hours × 4 slots/hour, that's
~320 manual slot entries/day per hospital — unworkable at multi-hospital scale and
highly error-prone (typos, missed days, inconsistent hours).

**Design:** Doctor (or Admin on a doctor's behalf) defines a weekly recurring
availability template once: working days, start/end time per day, slot duration,
break windows. A nightly scheduled Cloud Function (`generateRollingSlots`) reads all
active templates + the hospital's holiday calendar and materializes the slot
documents for the day 3 days out (keeping a constant 3-day rolling window). Slots are
created in `pendingApproval` status. **The doctor-approval gate from the spec is
unchanged** — slots only become patient-visible after the doctor (or Admin,
delegated) approves them. Office retains the ability to manually block or add
one-off slots (e.g., a doctor covering an extra shift, or an ad-hoc closure).

## 3. Soft-delete / data retention policy

**Gap:** "Never delete medical history" is a stated principle but no mechanism is
defined, and it's unclear if it applies to *all* records (e.g., a duplicate staff
account, an accidentally created department) or only clinical ones.

**Design:** universal soft-delete via the mandatory `status` field
(`active`/`disabled`/`archived`) on every collection. No document is ever physically
deleted via the application layer. Clinical collections (`consultations`,
`prescriptions`, `labReports`, `admissions`, `vitals`, `healthUpdates`) are additionally
**append-only** — updates create a new version rather than mutating history where the
underlying fact is clinical (e.g., a corrected diagnosis is a new consultation note
referencing the original, not an edit to it). Administrative records (staff,
departments, inventory) may be edited in place but never hard-deleted, only disabled.

## 4. Billing & invoicing

**Gap:** "Consultation Fees" exists as a data field on Admin's config, but there's no
invoice generation, payment tracking, or dues visibility anywhere in the spec —
a real hospital cannot operate without this.

**Design (Phase 1 scope — confirmed with stakeholder as internal-records-only, no
gateway):** an `invoices` collection generated automatically per
appointment/admission, aggregating consultation fee + lab charges + pharmacy charges
+ room charges as line items. Reception/Admin record payments against an invoice
(cash/card/UPI — recorded manually, no gateway integration) and the invoice tracks
`paymentStatus` (unpaid/partial/paid) and `paidAmount`. Admin dashboard surfaces
outstanding dues. Payment gateway integration is an explicit future item, not built
in Phase 1.

## 5. Feedback & complaint routing

**Gap:** "Feedback" is named as a module with no workflow.

**Design:** after a visit is marked complete, the patient can submit a rating (1–5)
and comment against that appointment. If the patient marks it as a complaint, it's
flagged and routed to the hospital's Admin dashboard for follow-up/resolution
tracking (`open` → `acknowledged` → `resolved`).

## 6. Insurance (flagged for future, not built in Phase 1)

**Gap:** spec lists "Insurance (Optional)" only as a patient signup field, with no
claims workflow — reasonable for Phase 1, but worth flagging as a known future module
so the data model doesn't need to be reshaped later.

**Design:** `patients.insurance` stores provider name, policy number, and a
document upload (Storage) in Phase 1 — no claims/pre-auth workflow. A future
`insuranceClaims` collection (status pipeline similar to lab orders) is anticipated
but explicitly out of scope now.

## 7. Discharge summary as a first-class step

**Gap:** "Discharge Summary" appears only as a bullet under Patient Timeline, with no
described authoring workflow, despite admission being a fully modeled workflow step.

**Design:** discharging a patient from an `admissions` record requires the attending
doctor to author a structured Discharge Summary (diagnosis, treatment given,
condition at discharge, follow-up instructions) before the bed can be released back
to `Available`. This is enforced at the service layer, not just convention.

## 8. Audit logging as foundational infrastructure

**Gap:** "Audit Logs" is listed as a module alongside things like "Feedback,"
implying it could be built late — but it's actually load-bearing for the "never
delete" guarantee, for RBAC accountability, and for any future compliance
certification (a real hospital system will eventually need this for regulatory
audits).

**Design:** every write to a clinical or administrative collection routes through a
single shared server-side write service (used by both Next.js server actions and
Cloud Functions) that appends an immutable `auditLogs` entry — actor, role, action,
entity type/id, before/after snapshot, timestamp. Built in Module 1, not deferred.

## 9. Extensible RBAC (for the future Nurse role and beyond)

**Gap:** Nurse is marked "future" in the spec. Hardcoding seven roles into switch
statements/if-chains would make adding an eighth role a multi-file code change.

**Design:** permissions are modeled as data — a role → module → action matrix stored
in `packages/shared` (see [08-permission-matrix.md](./08-permission-matrix.md)) and
mirrored into Firestore custom claims + security rules. Adding Nurse later means
adding a row to the matrix and a claim value, not rewriting authorization logic.

## 10. Notification delivery beyond FCM (flagged for future, not built in Phase 1)

**Gap:** FCM requires the recipient to have the app/PWA installed and notification
permission granted — realistic for staff, optimistic for patients on day one of a new
portal.

**Design:** Phase 1 ships FCM only, per spec. The notification-send service is built
as an abstraction (`sendNotification(userId, type, payload)`) with a single FCM
provider implementation, so an SMS/WhatsApp provider can be added later without
touching call sites. Not built now — noted so the roadmap isn't blocked reshaping this
later.
