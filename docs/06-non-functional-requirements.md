# 06 — Non-Functional Requirements

## NFR-1 · Security
- NFR-1.1 All Firestore/Storage access enforced by Security Rules independent of
  client code — the client is never trusted (defense in depth against a compromised
  or buggy frontend).
- NFR-1.2 Tenant isolation: a Firestore rule helper verifies the requester's
  `hospitalId` custom claim matches the document's `hospitalId` on every read/write,
  for every non-Super-Admin role.
- NFR-1.3 RBAC enforced at three layers: UI (route/menu visibility), server action/
  Cloud Function (authorization check before any write), and Firestore Security
  Rules (final enforcement).
- NFR-1.4 Sensitive fields (e.g., government ID numbers, if collected later) are
  never logged in plaintext in application logs.
- NFR-1.5 File uploads (Storage) are validated for content type and size limit before
  accept, and access-controlled by the same tenant/role model as Firestore.
- NFR-1.6 All state-changing Cloud Functions verify the caller's Firebase Auth ID
  token and custom claims — no unauthenticated callable functions except patient
  self-registration.

## NFR-2 · Availability & Reliability
- NFR-2.1 Target 99.5% uptime for Phase 1 (bounded by Firebase/Vercel SLAs — no
  additional infrastructure to manage).
- NFR-2.2 Scheduled Cloud Functions (slot generation, reminder dispatch) are
  idempotent — a retried/duplicate execution must not create duplicate slots or
  double-send reminders.
- NFR-2.3 Notification delivery failures (FCM) are logged and do not block the
  underlying business transaction (e.g., a failed push must not prevent a
  prescription from being marked dispensed).

## NFR-3 · Performance
- NFR-3.1 Dashboard list views (queue, appointments, patients) paginate — no
  unbounded Firestore queries.
- NFR-3.2 All list queries filter by `hospitalId`/`branchId` at the query level (not
  filtered client-side after fetch), backed by composite indexes — see
  [09-firestore-design.md](./09-firestore-design.md).
- NFR-3.3 Doctor queue view and vitals visibility (FR-8.3) update in near-real-time
  via Firestore listeners, not polling.

## NFR-4 · Scalability
- NFR-4.1 Data model supports an arbitrary number of hospitals without schema
  changes (flat top-level collections partitioned by `hospitalId`/`branchId`, not
  per-hospital collections or databases).
- NFR-4.2 No cross-hospital query ever runs on the client — only Super Admin
  aggregate views (via Cloud Functions/scheduled rollups), keeping per-hospital
  reads cheap and rule-enforceable.

## NFR-5 · Maintainability
- NFR-5.1 TypeScript strict mode across `apps/web`, `functions`, and
  `packages/shared` — no `any` in domain logic.
- NFR-5.2 Validation schemas (zod) live once in `packages/shared` and are used
  identically by client-side forms, server actions, and Cloud Functions — no
  duplicated/divergent validation.
- NFR-5.3 No business logic inside React components — all domain logic in
  `features/*/services` or `functions/src/services`, per
  [11-folder-structure.md](./11-folder-structure.md).
- NFR-5.4 RBAC permissions are data (a matrix), not hardcoded conditionals — adding a
  role is a data change (see [02-missing-features.md](./02-missing-features.md) §9).

## NFR-6 · Usability & Accessibility
- NFR-6.1 WCAG 2.1 AA color contrast and keyboard navigability across all dashboards.
- NFR-6.2 Every list/table has defined loading, empty, and error states — no bare
  spinners-forever or blank screens.
- NFR-6.3 Dark mode supported across all role dashboards via CSS custom properties
  (Tailwind `dark:` + shadcn theming), not a separate stylesheet.
- NFR-6.4 Responsive down to tablet width for all staff dashboards; patient portal
  additionally responsive to mobile web.

## NFR-7 · Data Integrity
- NFR-7.1 No hard deletes in the domain layer — soft-delete via `status` only (see
  [02-missing-features.md](./02-missing-features.md) §3).
- NFR-7.2 Clinical collections are append-only; corrections create new entries
  referencing the original rather than mutating history.
- NFR-7.3 Every collection carries `createdBy`/`createdAt`/`updatedAt` for
  traceability, in addition to the `auditLogs` record of the same event.

## NFR-8 · Observability
- NFR-8.1 Structured logging (actor, hospitalId, action) from all Cloud Functions.
- NFR-8.2 Audit log (FR-18) doubles as a business-level activity trail, queryable by
  Admin/Super Admin — no separate log aggregation tool required for Phase 1.

## NFR-9 · Portability (Phase 2 readiness)
- NFR-9.1 No business logic is duplicated between what a future Flutter client would
  need and what the web app has — both would call the same Cloud Functions/Firestore
  contract, so `packages/shared` types/validation define that contract in Phase 1
  even though only `apps/web` exists yet.
