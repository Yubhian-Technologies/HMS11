# 18 — Development Roadmap

Strict build order — one module at a time, each stopped for review before the next
starts, per the approved plan. No module begins before the documentation package
(this `/docs` directory) and the repo scaffold are in place.

## Milestone 0 — Documentation & Scaffold (this delivery)
- `/docs` package (all 19 documents, this one included).
- pnpm monorepo scaffold: `apps/web`, `functions`, `packages/shared`.
- Next.js app booted with role-gated route-group shells (no real data yet).
- `firestore.rules` / `firestore.indexes.json` / `storage.rules` skeletons with the
  scope helpers from doc 12, ready for each module to extend.
- **Exit criteria**: `pnpm --filter web dev` boots; `firebase emulators:start` runs
  clean against the rules skeleton.

## Milestone 1 — Module 1: Foundation
Auth wiring, custom claims, RBAC enforcement (middleware + rules), `writeWithAudit`
shared service, base `users` collection, login screen, role-based redirect.
**Exit criteria**: a seeded Super Admin can log in and reach `/super-admin`; every
other role attempting to log in without an account is rejected cleanly.

## Milestone 2 — Module 2: Hospital & Branch Management
Super Admin can create/edit/disable a hospital (auto-creates Main Branch), add
branches, assign an Admin. **Exit criteria**: a newly assigned Admin can log in and
see only their hospital.

## Milestone 3 — Module 3: Staff & Department Management
Admin creates Office/Reception/Doctor/Pharmacy/Lab accounts and Departments.
**Exit criteria**: each created staff account can log in and land on its correct
(empty) dashboard.

## Milestone 4 — Module 4: Hospital Settings & Catalogs
Timings, holidays, wards/rooms/beds, lab test master, medicine inventory catalog.
**Exit criteria**: Admin can fully configure a hospital's operational data.

## Milestone 5 — Module 5: Doctor Availability & Slots
Templates, nightly auto-generation (tested via emulator's scheduled-function
trigger), doctor approval UI. **Exit criteria**: approved slots for the next 3 days
are queryable and correctly excluded before approval/on holidays.

## Milestone 6 — Module 6: Patient Registration & Portal
Self-signup, Reception walk-in creation, profile view/edit. **Exit criteria**: a
patient can register and log into `/patient`.

## Milestone 7 — Module 7: Appointment Booking
Patient/Reception booking, Office approve/reject/reschedule, waiting list, emergency
queue. **Exit criteria**: full booking loop works end-to-end including the emergency
bypass path.

## Milestone 8 — Module 8: Reception & Vitals
Check-in, token generation, vitals capture visible in real time. **Exit criteria**:
vitals recorded by Reception appear on a Doctor's queue without refresh.

## Milestone 9 — Module 9: Consultation Workspace
Diagnosis/notes/prescription, lab order, admission+bed assignment, follow-up,
certificate, referral — single transactional submit. **Exit criteria**: a full
consultation can be completed and every resulting document (prescription, lab order,
etc.) is correctly cross-linked.

## Milestone 10 — Module 10: Laboratory Workflow
Order pipeline, report upload, notifications. **Exit criteria**: sequential status
enforcement rejects out-of-order transitions; report upload notifies doctor+patient.

## Milestone 11 — Module 11: Pharmacy Workflow
Dispensing, inventory decrement, reminder scheduling. **Exit criteria**: dispensing a
prescription schedules the correct number of `medicineLogs` entries.

## Milestone 12 — Module 12: Admissions & Bed Management
Admit/discharge, discharge summary gate. **Exit criteria**: a bed cannot return to
Available without a completed discharge summary.

## Milestone 13 — Module 13: Patient Timeline / EMR
Aggregated chronological read view. **Exit criteria**: every entry type from modules
6–12 renders correctly in one feed for a test patient with a full visit history.

## Milestone 14 — Module 14: Recovery Tracking
Dose logging, daily health updates, doctor-facing compliance view.

## Milestone 15 — Module 15: Billing
Invoice generation, payment recording, dues reporting.

## Milestone 16 — Module 16: Notifications
FCM wiring retrofitted across all trigger points from modules 2–15 (the abstraction
exists from Module 1 onward — this milestone is enabling+testing delivery for every
event type in FR-16.1, not building the abstraction itself).

## Milestone 17 — Module 17: Feedback

## Milestone 18 — Module 18: Analytics
Super Admin platform dashboard, Admin hospital dashboard, `dailyStats` rollups.

## Phase 2 (not started until Phase 1 milestones above are complete and stable)
Flutter Doctor app, Flutter Patient app — consuming the same callable functions and
Firestore contracts defined in doc 14, no backend changes anticipated beyond
mobile-specific push-token registration.
