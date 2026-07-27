# 09 — Firestore Database Design

> **Revision note:** this document originally chose flat top-level collections
> everywhere except `branches`. That decision is **reversed and implemented**:
> operational hospital data nests under `hospitals/{hospitalId}/branches/{branchId}/...`,
> for the reasons in §9.1 below. `patients` (and a handful of ownership-scoped
> collections) remain flat top-level by design — see §9.1.2. `firestore.rules`,
> `firestore.indexes.json`, and `functions/src/callable/*` all implement this nested
> shape now. Two corrections found during implementation, not yet reflected in every
> mention below (see [10-collections-schema.md](./10-collections-schema.md)'s Migration
> Status section for the full list): **`departments` is hospital-scoped**
> (`hospitals/{hospitalId}/departments`), not branch-scoped as §9.1/§9.1.1 below still
> say — a department spans every branch of its hospital; and there is **no separate
> `staff` collection** — `users/{uid}` remains the one staff directory, only the
> doctor extension nests directly under branch (`.../branches/{branchId}/doctors/{uid}`).

## 9.1 Multi-tenancy pattern: branch-scoped nested hierarchy + flat global entities

**Decision: nested subcollections under `hospitals/{hospitalId}/branches/{branchId}`**
for all branch-operational data (departments, staff, doctors, appointments,
admissions, labOrders, prescriptions, invoices, payments, medicines,
inventoryTransactions, wards, beds, notifications-of-record, auditLogs), **not** flat
top-level collections keyed by a `hospitalId`/`branchId` field.

Why nest instead of keeping the earlier flat design:

- **Path-based tenant isolation is stronger than field-based isolation.** A Security
  Rule that checks `request.auth.token.hospitalId == hospitalId` (a path segment,
  bound once per match block) cannot be bypassed by a malformed/omitted document
  field the way a rule checking `resource.data.hospitalId` can be if a write ever
  slips past validation. Nesting makes the tenant boundary structural, not
  convention-based.
- **A branch's entire operational dataset is one subtree.** Deleting/archiving a
  branch, exporting a branch for a data-portability request, or reasoning about "what
  does this branch see" is a prefix (`hospitals/{h}/branches/{b}/**`), not a fan-out
  query across a dozen flat collections filtered by two fields each.
- **Natural fit for the doctor/branch org chart.** `departments`, `staff`, `doctors`
  belong to exactly one branch for their operational lifetime (a doctor moving
  branches is a data-migration event, not a routine query parameter), so modeling
  that as a path rather than a filter matches the real ownership structure.
- **Query cost is unchanged for the common case.** Every list view in the product
  already scopes to one branch first (per the original §9.6 indexing note) — a
  subcollection query under that branch is exactly as cheap as the old
  `where(hospitalId==).where(branchId==)` query, just expressed as a path instead of
  two equality filters.

Cost accepted for this decision:

- **Cross-branch and cross-hospital reads require `collectionGroup()` queries.**
  Super Admin's "appointments today, all hospitals" or Admin's "appointments today,
  all branches of my hospital" now query a collection group (e.g.,
  `collectionGroup('appointments')`) instead of a single flat collection — see §9.6.
  This is the direct trade for stronger isolation and is a well-supported, indexed
  Firestore pattern, not a workaround.
- **A doctor/staff member's `staff` and `doctors` documents live under one branch.**
  A doctor who practices at two branches of the same hospital (or two hospitals) is
  represented by more than one `staff`/`doctors` document — this is intentional (their
  clinical profile, availability template, and slots are genuinely per-branch) and is
  reconciled at the `users/{uid}` level (one auth identity, many branch-scoped role
  documents), not by trying to make one `staff` document span branches.

### 9.1.1 Full nested hierarchy

```
hospitals/{hospitalId}
  branches/{branchId}
    departments/{departmentId}
    staff/{staffId}
      doctors/{staffId}                 (1:1 doc, only when staff.jobRole == "doctor")
        availabilityTemplates/{templateId}
        slots/{slotId}
    appointments/{appointmentId}
    admissions/{admissionId}
    labOrders/{labOrderId}
    prescriptions/{prescriptionId}
    invoices/{invoiceId}
      payments/{paymentId}
    medicines/{medicineId}
      inventoryTransactions/{transactionId}
    wards/{wardId}
      beds/{bedId}
    notifications/{notificationId}      (staff-facing; patient-facing notifications are flat, see below)
    auditLogs/{auditLogId}

patients/{patientId}                    — flat, global (§9.1.2)
users/{uid}                             — flat, global (§9.1.2)
```

`doctors/{staffId}` uses the **same id** as its parent `staff/{staffId}` document
(1:1 extension, not a separate id space) — see §9.3.

### 9.1.2 What stays flat, and why

| Collection | Why flat |
|---|---|
| `patients/{patientId}` | Global by design (per the mega-brief): a patient may be treated at multiple hospitals/branches over their lifetime. Nesting a patient under one branch would force a choice of "home branch" that doesn't reflect reality, and would make the patient's own consolidated timeline a fan-out across every branch they've ever visited instead of one `where(patientId==uid)` query. |
| `users/{uid}` | 1:1 with the Firebase Auth account across the whole platform (including patients, who have no branch). Auth-adjacent lookups (`onUserCreateSetClaims`, login) need a single well-known path independent of tenant, not a nested lookup requiring the hospital/branch to already be known. |
| `notifications/{notificationId}` (patient-facing) | A patient's inbox is not branch-scoped (ownership scope, same reasoning as `patients`). Staff-facing notifications *are* nested (`.../branches/{branchId}/notifications`) since they're inherently branch-scoped. |

## 9.2 Mandatory fields

Every document in every collection (except `auditLogs`, which has its own shape)
includes:

| Field | Type | Notes |
|---|---|---|
| `hospitalId` | string | Denormalized copy of the path segment. Not used for security (the path segment is authoritative in rules), but required for `collectionGroup()` queries, which can only filter on document *fields*, not on the ancestor path. |
| `branchId` | string \| null | Denormalized copy of the path segment; null only for hospital-scoped (not branch-scoped) documents — none currently, since even `departments` nests under a branch (a hospital-wide department is modeled as the same department created once per branch, or a future `hospitals/{h}/departments` addition if that need arises). |
| `createdBy` | string (uid) | |
| `createdAt` | Timestamp | server-generated |
| `updatedAt` | Timestamp | server-generated, updated on every write |
| `status` | string | collection-specific enum; always includes `active`/`disabled` at minimum — see §9.4 |

**Denormalized `hospitalId`/`branchId` fields must never be trusted as the source of
tenant truth** — they exist purely so `collectionGroup()` queries (§9.6) and Cloud
Function service code (which often only has a document snapshot, not its full path,
in hand) can filter without a `get()` round-trip. Security Rules always re-derive the
tenant from `hospitalId`/`branchId` **path segments** bound in the `match` block, per
§9.1's isolation argument — see §9.6 of
[10-collections-schema.md](./10-collections-schema.md) for the rules pattern.

## 9.3 Identifiers

- `users/{uid}` (all roles, including patients): document id = Firebase Auth `uid` —
  1:1 with the auth account, avoids a separate lookup collection. This is the one
  collection every role's document lives in regardless of tenant nesting elsewhere.
- `hospitals/{hospitalId}`: auto-generated id; root of the nested hierarchy.
- `hospitals/{hospitalId}/branches/{branchId}`: auto-generated id.
- `.../staff/{staffId}`: auto-generated id, **equal to the `users/{uid}` id** for
  that person (so `staffId == uid`) — this keeps the 1:1 relationship a direct id
  match instead of a lookup field.
- `.../staff/{staffId}/doctors/{staffId}` (nested under `doctors`, doc id repeats the
  parent's id): the doctor-specific extension document. Using the same id as its
  parent avoids an extra `doctorId` field and makes "does this staff member have a
  doctor profile" a single `get()`, not a query.
- `.../doctors/{staffId}/slots/{slotId}`: id pattern `${date}_${session}` (e.g.
  `2026-07-27_morning`), mirroring the existing deterministic-id pattern from the
  flat implementation's `${doctorId}_${date}_${session}` — the `doctorId` segment is
  now redundant (implied by the path) and dropped.
- `patients/{patientId}`: auto-generated id (or `== uid` when the patient
  self-registers, matching the existing flat implementation).
- All other nested collections: auto-generated document ids, referenced by `*Id`
  fields where a cross-subtree reference is needed (e.g., `appointments.doctorId`
  referencing a `.../staff/{staffId}` document, `labOrders.appointmentId`).

## 9.4 Status lifecycle by collection family

| Family | Status values | Notes |
|---|---|---|
| Tenancy (`hospitals`, `branches`, `users`, `staff`) | `active`, `disabled` | disabling cascades to login block, not to child data. |
| Scheduling (`slots`) | `pendingApproval`, `approved`, `rejected`, `booked`, `blocked`, `completed` | |
| Appointments | `BOOKED`, `CHECKED_IN`, `VITALS_COMPLETED`, `CONSULTING`, `LAB_REQUESTED`, `PAYMENT_PENDING`, `LAB_IN_PROGRESS`, `REPORT_UPLOADED`, `PRESCRIPTION_READY`, `ADMITTED`, `DISCHARGED`, `COMPLETED`, `CANCELLED` | full lifecycle embedded in the appointment document itself — see doc 10 §10.6. |
| Lab orders | `pending`, `sampleCollected`, `processing`, `completed`, `verified`, `reportUploaded` | sequential only, enforced in service layer. |
| Beds | `available`, `occupied`, `reserved`, `cleaning`, `maintenance` | |
| Admissions | `pendingBedAssignment`, `admitted`, `discharged` | discharge requires a linked discharge summary. |
| Invoices | `unpaid`, `partial`, `paid` | |
| Feedback | `open`, `acknowledged`, `resolved` | only present when `isComplaint == true`. |
| Generic catalogs (departments, lab test master, medicines, holidays) | `active`, `disabled` | |

## 9.5 Relationships

Firestore has no foreign keys — relationships are plain id-reference fields, resolved
client/service-side, whether the referenced document is a path-ancestor or not. Key
relationship chains:

```
hospitals ──< branches
branches  ──< departments, staff, appointments, admissions, labOrders,
              prescriptions, invoices, medicines, wards, notifications, auditLogs
staff     ──< doctors (1:1 extension doc, same id)
doctors   ──< availabilityTemplates ──< slots ──< appointments (by doctorId ref)
patients  ──< appointments (by patientId ref, cross-branch — the one relationship
              that necessarily crosses the nesting boundary, since patients are flat)
appointments ──< labOrders, prescriptions, admissions (by appointmentId ref;
              vitals/check-in/consultation lifecycle fields are embedded directly
              in the appointment, not referenced — see doc 10 §10.6)
admissions ──< beds (assignment by bedId ref)
invoices  ──< payments (subcollection)
every write ──> auditLogs (fire-and-forget append, service-layer, never a UI concern)
```

No document embeds another entity's full data — always a reference id + minimal
denormalized display fields (e.g., `appointments.patientName` cached for list-view
rendering without a join), refreshed by the write service on the rare occasions the
source changes. The one deliberate exception is the appointment lifecycle itself
(vitals, check-in metadata, consultation summary) — embedded by explicit design
choice, see doc 10 §10.6 for the rationale.

## 9.6 Indexing strategy

Two distinct query shapes now exist:

1. **Branch-scoped queries** (the common case — office/reception/nurse/doctor/
   pharmacy/lab, all working within one branch): a plain subcollection query under
   `hospitals/{h}/branches/{b}/{collection}`, filtered further by status/date/etc.
   Cheap and automatically tenant-isolated by path.
2. **Cross-branch / cross-hospital / cross-tenant queries**, which require
   `collectionGroup()`:
   - Super Admin platform-wide views (e.g., "today's appointments across every
     hospital") — `collectionGroup('appointments').where('date','==',today)`.
   - Admin's hospital-wide (cross-branch) views — `collectionGroup('appointments')
     .where('hospitalId','==', hId).where('date','==',today)` (relies on the
     denormalized `hospitalId` field from §9.2, since collection group queries can't
     filter on path ancestry directly).
   - A patient's own cross-hospital timeline — this one is **not** a
     `collectionGroup()` query in practice, because `patients`/notifications are
     already flat top-level (§9.1.2); only the branch-nested collections
     (`appointments`, `labOrders`, `prescriptions`, `admissions`, `invoices`)
     referencing that `patientId` need a collection-group query:
     `collectionGroup('appointments').where('patientId','==',uid).orderBy('date','desc')`.

Composite indexes follow:

```
(status/date field ASC/DESC, sort field)          — for branch-scoped subcollection queries
(hospitalId ASC, <status/date field>, sort field) — for collection-group hospital-wide queries
(patientId ASC, <sort field> DESC)                — for collection-group patient-timeline queries
```

Representative indexes (full list generated alongside each module's implementation):

- `appointments` (collection group): `(patientId, date DESC)` for the patient's own
  cross-hospital view; `(hospitalId, date, status)` for Admin's hospital-wide view.
- `appointments` (branch subcollection): `(doctorId, date, status)`,
  `(status, date)`.
- `slots` (nested under `doctors`): `(date, status)`.
- `labOrders` (collection group): `(patientId, createdAt DESC)`.
- `auditLogs` (collection group): `(hospitalId, createdAt DESC)`, `(entityType,
  entityId, createdAt DESC)`.

Firestore auto-suggests exact composite indexes from emulator/dev testing errors, so
this list is representative, not exhaustive — see doc 10 §10.5 for the full set
generated for this revision.

## 9.7 Denormalization & aggregates

- Dashboard counters (e.g., "today's appointment count") are read from a small
  per-branch `dailyStats` document (nested at `.../branches/{branchId}/dailyStats/
  {date}`) maintained by Cloud Function triggers, not computed by counting query
  results client-side, to keep dashboard loads O(1) reads regardless of data volume.
- Patient list-view display fields (name, avatar) are denormalized onto
  `appointments`/`admissions`/etc. at creation time to avoid N+1 lookups in queue
  views; the `patients` document remains the single source of truth for the
  underlying data.
- `hospitalId`/`branchId` themselves are the primary denormalization introduced by
  this revision (§9.2) — the cost of keeping them in sync with the path (which never
  changes after creation, since documents are never moved between branches) is zero
  after create time.
