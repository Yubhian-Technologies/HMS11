# 09 — Firestore Database Design

## 9.1 Multi-tenancy pattern: flat top-level collections

**Decision: flat top-level collections with `hospitalId`/`branchId` fields**, not
per-hospital subcollections (`hospitals/{id}/patients/...`) and not separate
Firestore databases per hospital.

Why:
- **Composite indexes scale to N hospitals for free.** A query like "today's
  appointments for branch X" is `where hospitalId == X and branchId == Y and date ==
  today`, backed by one composite index — identical cost whether there are 5
  hospitals or 5,000.
- **Super Admin cross-hospital views are possible.** Subcollections-per-hospital or
  separate databases would make "total appointments across the platform this month"
  require fanning out to every hospital individually. Flat collections make it one
  (indexed, possibly pre-aggregated) query.
- **Patient records must not be tenant-scoped.** A patient can be treated at
  multiple hospitals; their `patients`/`vitals`/`consultations`/etc. documents each
  carry the `hospitalId` of the encounter, but the *patient's own view* of their
  data (FR in [07-user-roles.md](./07-user-roles.md) §7.1 ownership scope) queries
  across hospitals by `patientId == request.auth.uid`, which only works cleanly with
  flat collections.
- **Security Rules stay uniform.** One rule-helper function
  (`belongsToRequesterHospital(resource)`) is reused verbatim across every
  collection, instead of per-hospital path-based rules that would need regenerating
  as hospitals are added.

Cost/isolation tradeoff accepted: tenant isolation is enforced entirely by Security
Rules + application-layer query scoping (always filter by `hospitalId`), not by
physical separation. This is the standard Firestore multi-tenant SaaS pattern and is
acceptable because Security Rules are non-bypassable from any client.

## 9.2 Mandatory fields

Every document in every collection (except `auditLogs`, which has its own shape)
includes:

| Field | Type | Notes |
|---|---|---|
| `hospitalId` | string | `"platform"` sentinel is never used — Super-Admin-owned docs (i.e. `hospitals` itself) simply have their own id as the tenant key. |
| `branchId` | string \| null | null for hospital-scoped (not branch-scoped) documents, e.g. a `department`. |
| `createdBy` | string (uid) | |
| `createdAt` | Timestamp | server-generated |
| `updatedAt` | Timestamp | server-generated, updated on every write |
| `status` | string | collection-specific enum; always includes `active`/`disabled` at minimum — see §9.4 |

## 9.3 Identifiers

- `users` (including patients and all staff): document id = Firebase Auth `uid` —
  1:1 with the auth account, avoids a separate lookup collection.
- `hospitals`: document id = auto-generated; referenced by `hospitalId` everywhere.
- `hospitals/{hospitalId}/branches`: subcollection — branches are the one deliberate
  exception to "flat top-level," because a branch has no independent existence
  outside its hospital and is never queried cross-hospital. Every other collection
  still stores `branchId` as a plain field for filtering.
- All other collections: auto-generated document ids, referenced by `*Id` fields
  (e.g., `appointments.doctorId`, `appointments.patientId`).

## 9.4 Status lifecycle by collection family

| Family | Status values | Notes |
|---|---|---|
| Tenancy (`hospitals`, `branches`, `users`) | `active`, `disabled` | disabling cascades to login block (FR-1.4), not to child data. |
| Scheduling (`doctorSlots`) | `pendingApproval`, `approved`, `rejected`, `booked`, `blocked`, `completed` | |
| Appointments | `pending`, `approved`, `rejected`, `rescheduled`, `checkedIn`, `completed`, `cancelled` | |
| Lab orders | `pending`, `sampleCollected`, `processing`, `completed`, `verified`, `reportUploaded` | sequential only, enforced in service layer (FR-10.2). |
| Beds | `available`, `occupied`, `reserved`, `cleaning`, `maintenance` | |
| Admissions | `admitted`, `discharged` | discharge requires a linked discharge summary (FR-12.3). |
| Invoices | `unpaid`, `partial`, `paid` | |
| Feedback | `open`, `acknowledged`, `resolved` | only present when `isComplaint == true`. |
| Generic catalogs (departments, lab test master, medicine inventory, holidays) | `active`, `disabled` | |

## 9.5 Relationships

Firestore has no foreign keys — relationships are plain id-reference fields, resolved
client/service-side. Key relationship chains:

```
hospitals ──< branches
hospitals ──< users (staff: hospitalId+branchId; patients: no hospital binding)
branches  ──< doctorProfiles, departments, roomsWardsBeds, labTestMaster, medicineInventory
doctorProfiles ──< doctorAvailabilityTemplates ──< doctorSlots ──< appointments
patients ──< appointments ──< vitals, consultations
consultations ──< prescriptions ──< medicineDispenses
consultations ──< labOrders ──< labReports
consultations ──< admissions ──< beds (assignment), dischargeSummaries
appointments ──< invoices (line items reference consultation/lab/pharmacy/room charges)
every write ──> auditLogs (fire-and-forget append, service-layer, never a UI concern)
```

No document embeds another entity's full data — always a reference id + minimal
denormalized display fields (e.g., `appointments.patientName` cached for list-view
rendering without a join), refreshed by the write service on the rare occasions the
source changes.

## 9.6 Indexing strategy

Every list/query in the product filters by `hospitalId` (+ `branchId` where
applicable) as the first equality clause — this is the partition key in practice.
Composite indexes are defined in `firestore.indexes.json`
(see [12-security-rules.md](./12-security-rules.md) for the paired rules file) and
follow the pattern:

```
(hospitalId ASC, branchId ASC, <status/date field> ASC, <sort field> DESC)
```

Representative indexes needed (full list generated alongside each module's
implementation, not enumerated exhaustively here since Firestore auto-suggests
missing ones during emulator/dev testing):

- `appointments`: `(hospitalId, branchId, doctorId, date)`, `(hospitalId, branchId,
  status, date)`, `(patientId, date DESC)` for the patient's own cross-hospital view.
- `doctorSlots`: `(hospitalId, branchId, doctorId, date, status)`.
- `labOrders`: `(hospitalId, branchId, status, createdAt)`.
- `beds`: `(hospitalId, branchId, wardId, status)`.
- `auditLogs`: `(hospitalId, createdAt DESC)`, `(entityType, entityId, createdAt
  DESC)`.

## 9.7 Denormalization & aggregates

- Dashboard counters (e.g., "today's appointment count") are read from a small
  per-branch `dailyStats` document maintained by Cloud Function triggers, not
  computed by counting query results client-side, to keep dashboard loads O(1)
  reads regardless of data volume.
- Patient list-view display fields (name, avatar) are denormalized onto
  `appointments`/`admissions`/etc. at creation time to avoid N+1 lookups in queue
  views; the `patients` document remains the single source of truth for the
  underlying data.
