# 08 — Permission Matrix

This is the authoritative role × module × action grid. It is implemented once as data
in `packages/shared/src/rbac/permission-matrix.ts` and consumed identically by: route
guards in `apps/web`, authorization checks in `functions`, and as the source that
generates the Firestore Security Rules role-check helpers (see
[12-security-rules.md](./12-security-rules.md)). This document is the human-readable
mirror of that file — if they ever disagree, the code file is authoritative and this
doc should be updated to match.

Legend: **C** create · **R** read · **U** update · **S** status-change (approve/
reject/disable — a restricted subset of update) · **X** none. All roles are
additionally scoped per [07-user-roles.md](./07-user-roles.md) §7.1 (platform/
hospital/branch/ownership) — this matrix defines *action* permissions; the *scope*
of "which documents" is enforced separately and identically for every role.

| Module | Super Admin | Admin | Office | Reception | Nurse | Doctor | Pharmacy | Lab | Patient |
|---|---|---|---|---|---|---|---|---|---|
| Hospitals | C R U S | R (own) | X | X | X | X | X | X | X |
| Branches | C R U S | C R U S (own hospital) | R | R | R | R | R | R | X |
| Staff accounts (`users`, non-patient) | R (all) | C R U S (own hospital) | R (own branch) | R (own branch) | R (own branch) | R (own branch) | R (own branch) | R (own branch) | X |
| Departments | R | C R U S | R | R | R | R | X | X | R |
| Hospital settings (timings, holidays) | R | C R U | R | R | R | R | X | X | R (read-only, for booking) |
| Rooms / Wards / Beds | R | C R U S | R | R | R U (ward care status) | R (assign only, via admission) | X | X | X |
| Lab Test Master | R | C R U S | X | X | X | R (to order tests) | X | R | R (read, for cost visibility) |
| Medicine Inventory catalog | R | C R U S | X | X | X | X | C R U | X | X |
| Doctor availability templates | R | C R U (delegated) | R | R | X | C R U (own) | X | X | X |
| Doctor slots | R | R | R S (block/add one-off) | R | R | S (approve/reject, own) | X | X | R (approved only) |
| Patients (profile) | R | R (own hospital patients) | R | C R U (walk-in creation) | R (queue patients) | R (assigned patients) | R (dispensing context) | R (order context) | C R U (own) |
| Appointments | R | R | C R U S (approve/reject/reschedule) | C R U (check-in) | R U (queue/vitals lifecycle) | R U (own queue) | X | X | C R (own) |
| Emergency queue | R | R | C R U | C R U | R U (own queue) | R U (own) | X | X | X |
| Vitals (embedded in appointment) | R | R | X | X | C R U (own patients, until sent to doctor) | R (assigned patients) | X | X | R (own) |
| Consultations | R | R | X | X | X | C R U (own patients) | X | X | R (own) |
| Prescriptions | R | R | X | X | X | C R (own patients) | R U (dispense) | X | R (own) |
| Lab orders | R | R | X | X | X | C R (own patients) | X | R U S (pipeline) | R (own) |
| Lab reports | R | R | X | X | X | R (own patients) | X | C R (upload) | R (own) |
| Medicine dispense records | R | R | X | X | X | X | C R U (own) | X | R (own) |
| Medicine logs (taken/missed/skipped) | R | R | X | X | X | R (own patients) | X | X | C R U (own) |
| Health updates (daily) | R | R | X | X | X | R (own patients) | X | X | C R (own) |
| Admissions | R | R | X | R (front-desk view) | R U (ward care, own ward) | C R U S (own patients) | X | X | R (own) |
| Follow-ups | R | R | R | R | X | C R U (own) | X | X | R (own) |
| Medical certificates | R | R | X | X | X | C R (own patients) | X | X | R (own) |
| Referrals | R | R | X | X | X | C R (own patients) | X | X | R (own) |
| Invoices | R | R U (payments) | X | R U (record payment) | X | X | X | X | R (own) |
| Notifications (own inbox) | R | R | R | R | R | R | R | R | R |
| Feedback | R | R U (resolve) | X | X | X | R (own patients) | X | X | C R (own) |
| Audit logs | R (platform-wide) | R (own hospital) | X | X | X | X | X | X | X |
| Analytics | R (platform-wide) | R (own hospital) | X | X | X | X | X | X | X |

## Notes

- "Own" always means scoped per §7.1 of [07-user-roles.md](./07-user-roles.md) — e.g.
  "Admin: own hospital" is enforced by the `hospitalId` claim match, not by
  application-level filtering alone.
- **Status-change (S)** is deliberately separated from plain update in high-stakes
  flows (hospital disable, appointment approve/reject, slot approve, lab pipeline
  transition, bed status) so the permission matrix — and the rules generated from it —
  can restrict *who may transition state* independently of *who may edit fields*.
- **Nurse is now a live Phase 1 role** (see [10-collections-schema.md](./10-collections-schema.md)
  changelog). Vitals capture moves from Reception to Nurse: Reception's role narrows
  to check-in/token/walk-in registration; Nurse owns the vitals-capture step of the
  appointment lifecycle (`CHECKED_IN` → `VITALS_COMPLETED`) and "sends to doctor,"
  and also does ward-care status updates during an admission (not bed
  assignment/discharge, which stay Office/Doctor respectively).
