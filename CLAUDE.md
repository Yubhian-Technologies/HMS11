# CLAUDE.md

Guidance for Claude Code (and any other agent) working in this repository.

## What this is

A multi-tenant Hospital Management System: Firebase (Auth, Firestore, Cloud Functions,
Storage, FCM) backend + Next.js App Router web frontend, pnpm workspace monorepo.
Full architecture/design documentation lives in `docs/` — **read `docs/README.md`
first**, it's the index and states the key decisions at a glance. Read the numbered
docs in order (01 → 19); later ones assume decisions made in earlier ones.

## Workspace layout

```
apps/web/        Next.js App Router UI (all roles)
functions/        Firebase Cloud Functions
packages/shared/  Types, zod validation, RBAC — imported by both apps/web and functions
packages/shared-server/  writeWithAudit() — server-only, depends on firebase-admin
docs/             Architecture/design documentation (read this before touching schema/RBAC)
firestore.rules / firestore.indexes.json / storage.rules
```

Full rationale for this layout: `docs/11-folder-structure.md`.

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

Run via `pnpm --filter functions seed:super-admin` / `seed:demo` (see each script's
header comment for required env vars — both support pointing at the Firebase
emulators via `FIRESTORE_EMULATOR_HOST`/`FIREBASE_AUTH_EMULATOR_HOST` instead of a
real service account).

## Changelog

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
