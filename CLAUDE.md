# CLAUDE.md

Guidance for Claude Code (and any other agent) working in this repository.

## What this is

A multi-tenant Hospital Management System: Firebase (Auth, Firestore, Cloud Functions,
Storage, FCM) backend + Next.js App Router web frontend, pnpm workspace monorepo.
Full architecture/design documentation lives in `docs/` — **read `docs/README.md`
first**, it's the index and states the key decisions at a glance. Read the numbered
docs in order (01 → 19); later ones assume decisions made in earlier ones.

## Workspace layout

**As of the 2026-08-17 entry below, this is a flat npm project, not a pnpm
monorepo** — the "Refactor monorepo into standard Next.js app" commit moved
everything out of `apps/web`/`packages/*` without updating this section (or
`functions/`'s own dependency wiring — see that changelog entry for the
breakage this caused and how it was fixed). Actual current layout:

```
src/               Next.js App Router UI (all roles) — was apps/web/src
src/shared/        Types, zod validation, RBAC — was packages/shared/src
src/shared-server/ writeWithAudit() — was packages/shared-server/src
functions/         Firebase Cloud Functions (own package.json, own npm install —
                    resolves @hms/shared via a tsconfig path alias into ../src/shared,
                    NOT an npm/pnpm workspace link; esbuild-bundled at deploy time,
                    see functions/scripts/prepare-functions-deploy.mjs)
docs/              Architecture/design documentation — treat as historical/aspirational,
                    not authoritative; it was never updated for the flattening and
                    disagrees with the code in several places. This file and the code
                    win over docs/ on any conflict.
firestore.rules / firestore.indexes.json / storage.rules
```

The `docs/11-folder-structure.md` rationale (and the numbered docs generally)
describe the *old* `apps/web` + `packages/*` pnpm layout — read them for
historical context on *why* a decision was made, not as a map of where things
currently live.

## Core conventions (don't violate these without updating the docs too)

- **Nested Firestore hierarchy**: branch-operational collections live at
  `hospitals/{hospitalId}/branches/{branchId}/{collection}`; `departments` is
  hospital-scoped (`hospitals/{hospitalId}/departments`); `users`, `patients`,
  `notifications`, `auditLogs`, `healthUpdates` stay flat/top-level (global or
  ownership-scoped — see `docs/09-firestore-design.md` §9.1). Always build paths via
  `packages/shared/src/paths.ts`'s helpers (`hospitalCollection`, `branchCollection`,
  `doctorPath`, `doctorCollection`) — never hardcode a nested path string.
- **Every write goes through a Cloud Function callable**, never a direct client
  write beyond a few narrow self-service field updates. Security Rules
  (`firestore.rules`) are the backstop against a bypassed/buggy client, not the
  primary authorization mechanism — see `docs/12-security-rules.md`.
- **Every callable's first line is `requireCallerRole()`** (`functions/src/services/
  callable-auth.ts`) — authorization comes only from verified custom claims, never
  client-supplied data.
- **`writeWithAudit()`** (`packages/shared-server`) is how every single-document
  write happens, so an audit log entry can never be forgotten. Multi-document
  transactions (booking, consultation, bed assignment) hand-roll their own
  `runTransaction` + inline audit write instead, since `writeWithAudit` only covers
  one document.
- **No hard deletes anywhere** — soft-delete via a `status` field
  (`active`/`disabled`, or collection-specific enums). `holidays` is the one narrow,
  deliberate exception (`deleteHoliday` really deletes — non-clinical scheduling
  record, no audit-sensitivity requirement).
- **The permission matrix is data, not code branches**:
  `packages/shared/src/rbac/permission-matrix.ts` is authoritative;
  `docs/08-permission-matrix.md` is its human-readable mirror — if they disagree, the
  code file wins and the doc should be updated to match.
- **The role × module × action matrix, custom claims, and Security Rules must move
  together.** Adding/changing a role's permissions means updating all three:
  `packages/shared/src/rbac/*`, the Firebase custom claims shape (set by
  `functions/src/triggers/onUserCreateSetClaims.ts`), and `firestore.rules`.

## Bootstrapping a local/dev environment

```
functions/scripts/seed-super-admin.mjs   — the only way a super_admin account is ever created (never in-app UI)
functions/scripts/seed-demo-data.mjs     — seeds one demo hospital with staff of every role + a patient mid-visit
```

Run via `npm --prefix functions run seed:super-admin` / `seed:demo` (not `pnpm
--filter` — see Workspace layout above; there is no pnpm workspace to filter
into anymore). See each script's header comment for required env vars — both
support pointing at the Firebase emulators via
`FIRESTORE_EMULATOR_HOST`/`FIREBASE_AUTH_EMULATOR_HOST` instead of a real
service account.

## Changelog

### 2026-08-17 — Firebase config repair, doctor-anonymous department booking, Reception consolidation

A single long session covering three things: (1) a full audit of local-vs-cloud
Firebase config that found the backend had been silently broken since the
monorepo-flattening refactor, (2) a product-directed redesign of the booking
flow, and (3) a role reassignment moving check-in + vitals to Reception. Also
touches the sister Flutter app (`VTH/hms`) — see that repo's own CLAUDE.md
changelog for its side of this.

**Firebase config repair — found via a from-scratch audit, not a bug report:**
- **`functions/` could not build or deploy at all.** The monorepo-flattening
  commit moved `packages/shared`→`src/shared` and
  `packages/shared-server`→`src/shared-server` for the web app, but
  `functions/node_modules/@hms/*` were still symlinks to the now-deleted
  `packages/*` — every callable failed `Cannot find module '@hms/shared'`.
  Whatever was live in Cloud Functions was whatever last deployed *before*
  that refactor. Fixed via a `tsconfig.json` path-alias pointing straight at
  `../src/shared`/`../src/shared-server` (see Workspace layout above) instead
  of reintroducing a workspace link; dropped the now-invalid
  `"@hms/shared": "workspace:*"` deps and the leftover pnpm-era
  `deploy`/`serve` scripts from `functions/package.json`.
- **`firestore.rules` had zero `{path=**}` collection-group rules.** Every
  nested rule (`match /appointments/{id}` etc.) only covers a `get()` on that
  exact nested path — Firestore does *not* extend that to a
  `collectionGroup()` query, which needs its own `{path=**}` declaration.
  Every client-side collection-group read a patient does (their own
  cross-branch appointments/prescriptions/labOrders/admissions/followUps/
  medicalCertificates/referrals/medicineLogs) was unconditionally
  permission-denied, always, for every patient — the actual cause behind a
  string of "permission-denied"/"upcoming appointment won't load" reports.
  Added the missing block (all scoped to `isOwner(resource)`, matching the
  existing ownership pattern) plus a narrow `{path=**}/doctors/{uid}`
  self-lookup rule for the doctor/nurse session's own claims-fallback path.
- **`medicineInventory` collection was misnamed `medicines` in rules** — the
  callables all write `medicineInventory`; the rules block gated a
  collection nothing ever wrote to, so the real one silently fell through to
  deny-all. Renamed (also dropped the imagined `inventoryTransactions`
  sub-collection nothing writes either).
- **Missing composite indexes**, each one a real callable throwing
  `FAILED_PRECONDITION` in production on everyday actions, found by tracing
  each flow rather than by trial and error: `checkInPatient`'s token-counter
  query (`date` + `checkIn`), `nurse`/Reception's ward queue (`admissions`
  `nurseId` + `status`), the doctor's prescriptions list
  (`prescriptions` `doctorId` + `createdAt`), and two collection-group
  field-overrides (`doctors` + `status`, `departmentReleases` +
  `publiclyBookable`) needed for the new department-browsing callable below.
- Cloud project (`project-h-1177a`) has ~24 orphaned indexes + 6 orphaned
  field overrides left over from schema generations before the 2026-07-27
  nested-hierarchy migration (`availabilityRequests`, `availabilityTemplates`,
  `bedRequests`, `doctorMedicineOrders`, `labRequests`, `visits`) — confirmed
  dead (zero code references), **not pruned** (index deploys are additive-only
  by default; pruning needs an explicit `--force`, left for a deliberate call
  rather than done inline).
- Confirmed via `firebase auth:export` that a number of Auth accounts
  (`*.demo@gmail.com`, `office11@gmail.com`, etc.) carry `hospitalId` claims
  pointing at hospitals that don't exist in Firestore at all — pre-existing
  breakage, not something this session's changes caused. Left alone except
  where it intersected the account cleanup below.

**Demo environment reset:**
- Deleted the two non-`lifegood` hospitals (`City General Hospital (Demo)`,
  `VISHNU HOSPITALS`) and everything nested under them — only **LIFE GOOD
  HOSPITAL** (`365ODpdeioGaV0XEUNhD`, branch `s0za6OS85m5mDpRVRnv4`) remains.
- Reset all existing lifegood staff (`admin`/`office`/`reception`/`nurse1`/
  `nurse2`/`pharmacy`/`lab`/three doctors `@lifegood.com`) to a known password
  and seeded 5 new patient accounts (`{name}.demo@lifegood.com`), each parked
  at a different pipeline stage (booked / vitals-done-waiting-for-doctor /
  consult-complete-with-pending-lab-and-rx / lab-report-ready /
  prescription-dispensed) so every role's screen has real data to demo
  against immediately.
- Deleted the entire `patients` collection (was full of accounts from broken
  provisioning states, no longer worth salvaging) — **only partially
  followed through**: 2 of 4 orphaned `users/{uid}` docs were also deleted,
  the other 2 (`guna23@gmail.com`, `patient1@bvrh.in`) were not (blocked
  mid-cleanup, never retried), and none of the underlying Firebase **Auth**
  accounts were touched at all — there's no Auth-user-delete path available
  from a CLI session, only Firestore doc deletes.
- Seeded an 8-item `labTestMaster` catalog for lifegood/its branch (CBC, ECG,
  Blood Sugar, LFT, KFT, Urine Routine, X-Ray Chest, Lipid Profile) — it had
  been completely empty, which is why the doctor's consult-form lab-test
  picker rendered a title with nothing under it.

**Doctor-anonymous department booking** (product-directed redesign, not a
bug fix): a patient now books a **department**, never sees a doctor's name.
- New `departmentReleases/{departmentId}` doc per branch
  (`publiclyBookable: boolean`, new `setDepartmentPublicRelease` callable,
  Office-only) — a department is bookable by a patient at a branch only when
  this is explicitly released, independent of whether individual doctor
  slots are `approved`. Surfaced as a per-department toggle at the top of
  Office's Slots page.
- `DoctorSlot` gained a denormalized `departmentId` (set by
  `createManualSlot`/`bulkCreateManualSlots` from the doctor's own profile)
  — **currently dead weight**: the aggregation below ended up looking up
  each known doctor's slot directly rather than running a
  collection-group query filtered by this field, so nothing actually reads
  it yet. Either wire up that query or drop the field.
- `listBookableDoctors` (this session's own earlier, now-superseded
  addition) replaced by `listBookableDepartments`: returns every
  publicly-released department platform-wide, "General Medicine" (if
  released) flagged `isGeneral` for the client to lead with, every other
  released department as an optional specialization, each with pooled
  online capacity per (date, session) **summed across every doctor in that
  department** for the rolling 3-day window.
- `bookAppointment` now takes `departmentId` **or** `doctorId` (schema
  enforces exactly one supplied), not always `doctorId`: a patient supplies
  only `departmentId` and the callable auto-assigns to whichever doctor in
  that department has the most remaining capacity for the requested
  (date, session); Reception's own walk-in booking is unchanged — still
  picks a specific doctor directly, since staff aren't meant to have names
  hidden from them. Also now fans out a `sendNotification` to every active
  Office user at the branch on every booking.
- Office's Appointments page gained a "Today's Bookings — by Department"
  consolidated summary card above the existing status tabs, and every row
  now shows department name alongside doctor name.
- **Known correctness gap, not yet fixed**: the doctor auto-assignment above
  picks the best doctor via plain reads *before* the transaction that
  actually claims a seat — if that specific doctor's pool loses a race to a
  concurrent booking, the transaction correctly rejects, but the callable
  just throws "fully booked" instead of retrying the next-best doctor in the
  department. Under real concurrent load this means a department with
  genuine remaining capacity can spuriously reject a booking. Needs a
  retry-across-candidates loop inside (or wrapping) the transaction.
- **Known scope trim**: patient-side waiting-list (`joinWaitingList`) was not
  adapted to department-based booking — it's still doctor-scoped, and the
  patient booking UI (both web and Flutter) no longer offers it at all when
  a department is fully booked. Reception's own doctor-based booking still
  has it.
- No server-side guard against booking a past `date`, or against a patient
  double-booking overlapping appointments — neither was validated before
  this pass either, noting it as newly-relevant now that booking is a single
  general-purpose callable rather than several narrower ones.

**Reception role consolidation**: check-in and vitals moved from
Office/Nurse (the 2026-08-15 assignment below) back onto Reception as one
role owning the whole booked→queued front-desk handoff.
- `checkInPatient` and `recordVitals` both now require caller role
  `reception` (were `office` and `nurse` respectively). `permission-matrix.ts`
  updated (`nurse` appointments access dropped from `RU` to `R`); rules'
  `appointments` update clause swapped the old nurse-only vitals branch for a
  reception branch covering both transitions
  (`BOOKED→CHECKED_IN`/`CHECKED_IN→VITALS_COMPLETED`, each still field-locked
  via `onlyFieldsChanged`).
- Office's Appointments page lost its Check-In button; Reception's own page
  (previously just a `/reception/book` redirect) is now the real dashboard —
  **Today** (filterable by session: All/Morning/Afternoon, with live counts)
  and **Upcoming** (rest of the rolling 3-day window, grouped by day), each
  row offering Check-In or Record Vitals depending on current status. Nurse's
  web `/nurse` route now redirects straight to `/nurse/ward-care` — vitals
  was nurse's only other page.
- **Known gap, not yet built**: no expiry/timeout path for a `CHECKED_IN`
  appointment whose vitals never get recorded, or a `CONSULTING` one a
  doctor never finishes — `expireStaleAppointments` only ever reclaims
  still-`BOOKED` no-shows. Both queues can accumulate dead entries with no
  way to close them out.

**Consult form: custom lab tests.** `submitConsultation` gained
`customLabTests: string[]` (free-text names) alongside the existing
catalog-bound `labTestIds`, matching how `prescription` was already
free-text, not catalog-bound — an "Add Item" entry point next to the
existing lab-test picker in both the web `ConsultationForm` and the Flutter
consult sheet. A custom order's `testId` is set to its own generated
labOrder doc id (guaranteed not to collide with a real `labTestMaster`
entry) rather than a shared magic string, so `generateInvoice`'s
`labTestMaster` price lookup simply finds nothing and prices it at ₹0 — an
accepted trade-off (a test outside the priced catalog has no price to bill),
not a bug.

**Verification status**: every change in this entry was verified via
`tsc --noEmit` (functions and web) and a full `next build` after each
batch, plus live smoke-testing of the new/changed Cloud Functions via
temporary diagnostic `onRequest` endpoints (deployed, invoked once, deleted
immediately after — never left in production). All backend changes are
deployed to `project-h-1177a`. **No actual click-through browser/emulator
testing was done** — same standing constraint as every prior entry (no Java
runtime here for the Local Emulator Suite) — nothing in this entry has been
seen working end-to-end through a real UI by the agent that wrote it.

**Not done in this pass** — a broader edge-case pass (concurrency,
input-size limits, App Check currently disabled project-wide, stale FCM
token pruning, past-date/duplicate-booking guards, catalog-vs-custom
lab-test-name dedup) was reasoned through but deliberately left
unimplemented pending product prioritization; ask for the full list rather
than assuming it's covered.

### 2026-08-15 — Phase A→D flow-consistency pass (capacity/booking/check-in/consultation)

Implemented against a written Phase A→D product-flow audit; see that audit's
decision log for the product calls behind each item below.

- **Phase A — capacity origination unified**: retired the doctor-authored
  recurring-template + nightly `generateRollingSlots` mechanism entirely
  (deleted `createAvailabilityTemplate`/`setAvailabilityTemplateStatus`/
  `generateRollingSlots`, the `DoctorAvailabilityTemplate` type/collection,
  and the "Weekly Template" doctor UI). Office's ad-hoc proposal flow
  (`createManualSlot` → `submitSlotProposal` → `setSlotStatus`) is now the
  only way a `doctorSlots` pool originates — no more two mechanisms writing
  the same doc id. **Online/walk-in split moved to Office**: the doctor's
  `submitSlotProposal` now confirms/adjusts `totalCount` only; Office sets
  `walkInReserved` and the new `checkInCutoffMinutes` at publish time
  (`setSlotStatus` → `approved`), matching the product order (doctor
  confirms total, then Office splits).
- **Phase B — booking status gate split by caller**: `bookAppointment` now
  starts a Reception walk-in at `BOOKED` directly (already staff-initiated
  in person); a patient's own online booking still starts `PENDING`,
  gated on Office approval (`setAppointmentStatus`).
- **Phase C — check-in moved to Office**: `checkInPatient` is now
  `office`-only (was `reception`-only); the check-in action moved from the
  Reception page onto Office's Appointments page. Both `checkInPatient` and
  `recordVitals` now run inside a Firestore transaction (previously a plain
  get-then-update — a real double-submit race). **No-show expiry added**:
  new `EXPIRED` status + `expireStaleAppointments` scheduled function
  (every 5 min) flips a stale `BOOKED` appointment past its pool's
  `checkInCutoffMinutes` and reclaims the held unit into `walkInReserved`
  (this didn't exist before at all).
- **Phase D — appointment status no longer encodes branch outcome**: this
  was the central finding of the audit — `AppointmentStatus` used to
  include `LAB_REQUESTED`/`PRESCRIPTION_READY`/`ADMITTED`/`PAYMENT_PENDING`/
  `LAB_IN_PROGRESS`/`REPORT_UPLOADED`/`DISCHARGED` as appointment-level
  values, and `submitConsultation` picked exactly one via an if/else chain
  that never actually assigned `ADMITTED` at all. `AppointmentStatus` is now
  visit-lifecycle-only (`PENDING/BOOKED/CHECKED_IN/VITALS_COMPLETED/
  CONSULTING/COMPLETED/EXPIRED/REJECTED/RESCHEDULED/CANCELLED`);
  `submitConsultation` always sets `COMPLETED` on submit regardless of which
  of the three branches fired, and each branch's real state lives only in
  its own collection (`admissions.status`, `labOrders.status`,
  prescription dispensing) — already independently queryable
  (`getPatientHistory` et al.), now the only source of truth for branch
  state. Added a real `startConsultation` callable
  (`VITALS_COMPLETED`→`CONSULTING`) so `submitConsultation` requires
  `CONSULTING` instead of jumping straight from `VITALS_COMPLETED` — a
  doctor's queue can now distinguish "next in line" from "already being
  seen," and a `CONSULTING` appointment stays visible on the queue as
  resumable instead of disappearing.
  - **Consult-only origination**: retired `assignLabOrder`/
    `assignMedicineOrder` and the entire `doctorMedicineOrders` collection
    (type, validation, rules, indexes, UI) — Admission/Prescription/Lab now
    originate only from `submitConsultation`, eliminating the
    two-independent-paths duplicate-record risk. The Doctor Labs/
    Prescriptions pages are now read-only status views.
  - **Every lab order requires prepayment**: consult-flow lab orders now
    start at `pendingPayment` (previously skipped straight to `pending`,
    bypassing Office's payment gate that the standalone path enforced) —
    `markLabOrderPaid` is the one universal gate into the processing
    pipeline regardless of origin.
  - **Bed assignment is Office-only**: `assignBedToAdmission` no longer
    accepts the `doctor` role (the doctor's admissions page dropped its
    "Assign Bed" action) — matches "Office checks bed availability and
    allots the bed," not the doctor.
  - **Office explicitly assigns the ward-care nurse**: new
    `assignNurseToAdmission` callable (Office picks from the branch's nurse
    roster, wired into Office's Room Assignment page) replaces the old
    behavior where `updateWardCareStatus` silently self-assigned
    `nurseId` to whichever nurse called it first; that callable now
    requires the caller to already be the assigned nurse.
  - **Consult draft autosave**: appointments gained an embedded
    `consultDraft` field; `ConsultationForm` debounce-autosaves in-progress
    selections directly via the client SDK (Security Rules restrict the
    doctor's write to exactly `consultDraft`/`updatedAt`) and restores them
    on mount, so a refresh/crash mid-consultation no longer loses
    unsubmitted work. `submitConsultation` clears it on successful submit.
- **Verification status**: `packages/shared`, `packages/shared-server`,
  `functions`, and `apps/web` all typecheck/build clean (`pnpm --filter
  <pkg> build` / `typecheck`), including a full `next build`. End-to-end
  verification against the Firestore/Auth emulators was **not** run (same
  constraint as the 2026-07-27 entry below — no Java runtime on this
  machine for the Local Emulator Suite). Before trusting this in a real
  environment: run the emulator suite, reseed
  (`seed-super-admin`/`seed-demo`), and walk Office-propose → doctor-confirm
  → Office-split-and-release → book → check-in → vitals → start-consult →
  submit-consult (Admission+Prescription+Lab together) → Office bed+nurse
  assignment → Pharmacy dispense → Lab result upload, end to end.
- **Not done in this pass** (explicitly out of scope per the audit's
  decision log): a single-action "propose 3 days × 2 sessions at once" bulk
  Office UI (each proposal is still one `(date, session)` at a time; doctor
  and Office each still have a bulk *confirm*/*publish*-all-for-one-date
  shortcut) — deferred, not blocking.

### 2026-07-27 — Nested Firestore hierarchy + Nurse role activation

Migrated the schema from flat top-level Firestore collections to the nested
hierarchy described in `docs/09-firestore-design.md` §9.1 / `docs/10-collections-
schema.md`, and activated Nurse as a live role (previously reserved, no UI/
permissions). Summary of what changed and why — see `docs/10-collections-
schema.md`'s own changelog section for the schema-level detail:

- **Nested hierarchy**: `hospitals/{h}/branches/{b}/{collection}` for
  branch-operational data (appointments, admissions, labOrders, prescriptions,
  invoices, wards/rooms/beds, medicineInventory, labTestMaster, holidays,
  availabilityRequests, followUps, medicalCertificates, referrals, feedback,
  dailyStats, and the renamed `doctors` — formerly flat `doctorProfiles` — with
  `availabilityTemplates`/`slots` nested one level further under each doctor).
  `departments` is hospital-scoped, not branch-scoped (a department spans every
  branch of its hospital — this corrects an error in the first draft of doc 09/10,
  which had nested it under branch; the real semantics, already implicit in
  `doctorProfiles.departmentId` usage, were hospital-scoped all along).
  `users`/`patients`/`notifications`/`auditLogs`/`healthUpdates` stay flat.
- **Deviations from doc 10's original tree diagram**, made during implementation
  for lower risk/complexity with no loss of tenant isolation:
  - No separate nested `staff` collection — `users/{uid}` (already flat, already
    carrying `hospitalId`/`branchId`) remains the one staff directory; only the
    doctor-specific extension (`doctors/{uid}`) actually nests under branch, since
    that's the one place scheduling data (`availabilityTemplates`/`slots`) benefits
    from it.
  - `wards`/`rooms`/`beds` are three sibling branch-level collections, not
    physically nested inside each other — bed/room lookups are always by their own
    id (e.g. `assignBedToAdmission` receives a bare `bedId`) with a denormalized
    `roomId`/`wardId` reference field, matching the pre-migration pattern; full
    physical nesting would force every such lookup to also thread ward/room
    ancestry for no additional isolation benefit.
  - `notifications` stays entirely flat for every recipient (staff and patient
    alike), not split into a nested staff-facing collection + flat patient-facing
    one — a notification is addressed by `userId` and never queried cross-user, so
    nesting it would add path complexity with no isolation benefit.
  - `auditLogs` stays flat/platform-level, not nested under branch — some audited
    actions (creating a hospital, assigning a hospital admin) happen before any
    branch — or even hospital — exists to nest under, and Super Admin's
    platform-wide audit view needs a flat collection to query across hospitals.
- **Nurse activated**: vitals capture moves from Reception to Nurse (new `/nurse`
  route in `apps/web`, new `recordVitals` caller role, new `updateWardCareStatus`
  callable for ward-care progress notes during an admission). Reception keeps
  check-in/token/walk-in registration only.
- **Appointment lifecycle embedded**: `vitals`, check-in metadata, and the
  consultation summary are fields on the `appointments` document itself
  (`vitals`/`checkIn`/`consultationSummary`), not separate `vitals`/`consultations`
  collections — the doctor's live queue and Nurse's "send to doctor" hand-off are a
  single document write/read, never a join. `status` is a fuller lifecycle enum
  (`PENDING → BOOKED → CHECKED_IN → VITALS_COMPLETED → CONSULTING → ...`). Trade-off
  accepted: `consultationSummary` is edited in place, not an append-only correction
  chain the way the old standalone `consultations` collection was
  (`supersedesConsultationId`) — if immutable clinical history becomes a hard
  requirement later, add a `revisions` array to `consultationSummary` rather than
  reintroducing a separate collection.
- **Scope trim, not yet built**: `submitConsultation` sets the appointment's coarse
  status (`LAB_REQUESTED` / `PRESCRIPTION_READY` / `COMPLETED`) but there's no
  "doctor resumes the same visit after the lab report comes back" second
  consultation step — the fine-grained lab pipeline continues to be tracked
  independently on `labOrders.status`, same as before this migration. A full
  closed-loop lab-then-consult-again workflow is a larger feature than this schema
  migration covers.
- **Collection-group queries** now back every cross-branch/cross-hospital read
  (Super Admin/Admin rollups, a patient's own cross-hospital timeline) — see
  `firestore.indexes.json` for the `COLLECTION_GROUP`-scoped indexes this requires,
  and `docs/09-firestore-design.md` §9.6 for the pattern.
- Everything above is a from-scratch schema change (no production data existed at
  migration time), so there was no backfill/dual-write migration step — a real
  future schema change with live data would need one.
- **Seed data**: `functions/scripts/seed-demo-data.mjs` (new, `pnpm --filter functions
  seed:demo`) creates one demo hospital/branch with staff of every role including
  Nurse, two doctors, a ward/room/bed, and one patient with an appointment already
  `CHECKED_IN` — enough that every role's dashboard has something to show and the
  Nurse → Doctor → Lab → Pharmacy loop can be exercised live. Kept separate from
  `seed-super-admin.mjs`, which stays focused on the one super_admin bootstrap.
- **Verification status**: `packages/shared`, `packages/shared-server`, `functions`,
  and `apps/web` all build/typecheck clean (`pnpm --filter <pkg> build` /
  `typecheck`). End-to-end verification against the Firestore/Auth emulators
  (seed → click through each role's dashboard) was **not** completed — this
  machine has no Java runtime, which the Firebase Local Emulator Suite requires for
  Firestore/Auth. Before trusting this migration in a real environment, run
  `firebase emulators:start`, `pnpm --filter functions seed:super-admin`, `pnpm
  --filter functions seed:demo`, and walk each seeded role's dashboard at least once.
