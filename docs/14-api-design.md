# 14 — API Design

> **Revision note:** updated for the nested-hierarchy schema in
> [09-firestore-design.md](./09-firestore-design.md) /
> [10-collections-schema.md](./10-collections-schema.md) and the activated Nurse
> role. Collection paths below reflect the *target* design; see doc 10's Migration
> Status section for what `functions/src/callable/*` actually implements today (flat
> paths, no Nurse callables).

There is no separate REST/GraphQL API server. Two access patterns cover the entire
system, matching the "reusable backend for web and future Flutter" requirement:

1. **Direct Firestore reads** (client SDK, real-time listeners) for anything covered
   by Security Rules alone — list views, detail views, subscriptions to
   queue/vitals-lifecycle updates. No custom API needed for these; the rules in doc
   12 are the entire authorization layer.
2. **Callable Cloud Functions** (`httpsCallable`, doc 13 §13.3) for anything that is a
   *business action* rather than a plain field write — i.e., anything with side
   effects (notifications, cross-collection consistency, sequential-state
   enforcement) or elevated-privilege provisioning (creating a staff account). This
   is the "API" in the traditional sense, and its contracts below are exactly what a
   Phase 2 Flutter client will also call — no separate mobile API is ever needed.

Next.js **server actions** in `apps/web` are a thin proxy in front of the same
`services/`/callable-function logic for cases where a web-only UI needs
server-rendered data or form handling — they must not contain business logic that
callable functions don't already express, so nothing web-specific leaks into the
contract Flutter will depend on in Phase 2.

## 14.1 Contract format

Every callable function request/response pair is defined once as a zod schema in
`packages/shared/src/validation/<feature>.ts` and inferred into a TypeScript type —
this *is* the contract; there is no separately maintained OpenAPI/interface doc to
drift from it. Every request that targets a nested document carries the full path
context (`hospitalId`, `branchId`, plus any intermediate ids like `doctorId`) since
callables build the Admin SDK path themselves — clients never construct Firestore
paths directly.

```ts
// packages/shared/src/validation/appointments.ts
export const BookAppointmentRequest = z.object({
  hospitalId: z.string(),
  branchId: z.string(),
  doctorId: z.string(),          // .../staff/{doctorId}/doctors/{doctorId}
  date: z.string(),
  session: z.enum(["morning", "afternoon"]),
  patientId: z.string(),         // self, or specified by reception on behalf of a walk-in
  departmentId: z.string(),
});
export const BookAppointmentResponse = z.object({
  appointmentId: z.string(),
  status: z.literal("BOOKED"),
});

// packages/shared/src/validation/vitals.ts — NEW: Nurse-only, replaces the old
// standalone recordVitals-into-its-own-collection contract
export const RecordVitalsRequest = z.object({
  hospitalId: z.string(),
  branchId: z.string(),
  appointmentId: z.string(),
  bp: z.string(),
  pulse: z.number().int().positive(),
  temperatureC: z.number(),
  weightKg: z.number().positive(),
  heightCm: z.number().positive(),
  spo2: z.number().int().min(0).max(100),
  sugarMgDl: z.number().nonnegative().optional(),
  respiratoryRate: z.number().int().positive().optional(),
  chiefComplaint: z.string(),
}).strict();
export const RecordVitalsResponse = z.object({
  appointmentId: z.string(),
  status: z.literal("VITALS_COMPLETED"),
});

// packages/shared/src/validation/consultations.ts — writes the embedded
// consultationSummary on the appointment, plus separate prescriptions/labOrders/
// admissions documents, in one transaction
export const SubmitConsultationRequest = z.object({
  hospitalId: z.string(),
  branchId: z.string(),
  appointmentId: z.string(),
  diagnosis: z.string().min(1),
  clinicalNotes: z.string(),
  prescription: z.array(z.object({
    medicineName: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    durationDays: z.number().int().positive(),
    instructions: z.string(),
  })).optional(),
  labTestIds: z.array(z.string()).optional(),
  admissionRequested: z.boolean().optional(),
  followUp: z.object({ scheduledDate: z.string() }).optional(),
}).strict();
export const SubmitConsultationResponse = z.object({
  appointmentId: z.string(),
  prescriptionId: z.string().nullable(),
  labOrderIds: z.array(z.string()),
  admissionId: z.string().nullable(),
});

// packages/shared/src/validation/lab.ts
export const AdvanceLabOrderStatusRequest = z.object({
  hospitalId: z.string(),
  branchId: z.string(),
  labOrderId: z.string(),
  toStatus: z.enum(["sampleCollected", "processing", "completed", "verified"]),
});
```

## 14.2 Callable inventory by workflow

Grouped by the mega-brief's named workflows; supersedes doc 13 §13.3's flat-path
version. Every function's first line is still an authorization check against
[08-permission-matrix.md](./08-permission-matrix.md), and every multi-document write
is still a single transaction (doc 13 §13.4) — only the collection paths and the
Nurse-related split change here.

| Workflow | Function | Caller | Notes |
|---|---|---|---|
| **Slot Creation** | `createAvailabilityTemplate` | doctor (own) / admin (delegated) | writes `.../doctors/{doctorId}/availabilityTemplates` |
| | `generateRollingSlots` (scheduled) | system | materializes `.../doctors/{doctorId}/slots/{date}_{session}`, `pendingApproval` |
| | `respondAvailabilityRequest` / `bulkApproveSlots` | doctor (own) | flips slot(s) to `approved`/`rejected` — "Published Slots" gate |
| **Appointment Booking** | `bookAppointment` | patient (self) / reception (on behalf) | draws from the slot's counter; appointment starts `BOOKED` |
| | `setAppointmentStatus` (approve/reject/reschedule) | office | office approval gate before check-in is possible |
| **Check-In** | `checkInPatient` | reception | assigns `token`, sets embedded `checkIn`, status → `CHECKED_IN`; **adds the patient to the Nurse queue** (same write — the queue is just `.../appointments.where(status=='CHECKED_IN')`) |
| **Nurse Flow** | `recordVitals` | **nurse** (moved from reception) | writes embedded `vitals`, status → `VITALS_COMPLETED` — "Send to Doctor" is this same call, not a separate step (§10.6) |
| | `updateWardCareStatus` | nurse (own ward) | updates admission ward-care notes; does not touch `bedId`/`status` (Office/Doctor own those) |
| **Doctor Flow** | `submitConsultation` | doctor (own appointment) | writes embedded `consultationSummary`; conditionally creates `prescriptions`/`labOrders`/`admissions` (status `pendingBedAssignment`) in the same transaction; status → `CONSULTING` then `LAB_REQUESTED`/`PRESCRIPTION_READY` depending on branches taken |
| **Payment** | `generateInvoice` | reception / admin | aggregates consultation + lab + pharmacy + room line items on demand |
| | `recordPayment` | reception / admin | subcollection write to `.../invoices/{id}/payments`; status → `PAYMENT_PENDING` cleared once `paidAmount >= totalAmount` for the lab-charge portion |
| **Laboratory** | `advanceLabOrderStatus` | lab | sequential pipeline only |
| | `uploadLabReport` | lab | sets `reportUrl`, appointment status → `REPORT_UPLOADED`, notifies doctor + patient |
| **Admission** | `assignBedToAdmission` | office / doctor | transactionally flips bed → `occupied`, admission → `admitted`, appointment status → `ADMITTED` |
| | `assignWardNurse` | office | sets `admissions.nurseId` |
| | `dischargePatient` | doctor | requires `dischargeSummary` payload; frees the bed; appointment status → `DISCHARGED` then `COMPLETED` |
| **Staff/Doctor Mgmt** | `createStaffAccount` | admin | writes `users/{uid}` + `.../staff/{uid}` |
| | `createDoctorAccount` | admin | writes `users/{uid}` + `.../staff/{uid}` + `.../staff/{uid}/doctors/{uid}` atomically |

## 14.3 Error contract

Every callable function throws a Firebase `HttpsError` with a stable machine-readable
`code`:

| Code | Meaning |
|---|---|
| `unauthenticated` | No valid ID token. |
| `permission-denied` | Authenticated, but role/scope check against doc 08 failed. |
| `failed-precondition` | Valid request, but domain state forbids it (e.g., advancing a lab order out of sequence, or recording vitals on an appointment that isn't `CHECKED_IN`). |
| `invalid-argument` | zod validation failed; message includes the field path. |
| `not-found` | Referenced entity id doesn't exist, isn't under the given `hospitalId`/`branchId` path, or isn't visible to the caller. |

The web app maps these codes to consistent toast/inline error UI — never a raw stack
trace to the user.

## 14.4 Real-time subscriptions (not callable — direct listeners)

| View | Query pattern |
|---|---|
| Doctor's live queue (vitals included) | `.../branches/{branchId}/appointments.where('doctorId','==',uid).where('date','==',today)` — vitals arrive inline, no second listener (§10.6) |
| Nurse's vitals-pending queue | `.../branches/{branchId}/appointments.where('status','==','CHECKED_IN')` |
| Office daily schedule | `.../branches/{branchId}/appointments.where('date','==',today)` |
| Patient's own cross-hospital timeline | `collectionGroup('appointments').where('patientId','==',uid).orderBy('date','desc')` (and the equivalent for `labOrders`, `prescriptions`, `admissions`, `invoices` — doc 09 §9.6) |
| Patient's own notification inbox | flat `notifications.where('userId','==',uid).orderBy('createdAt','desc')` |
| Bed availability board | `.../branches/{branchId}/wards/{wardId}/rooms/{roomId}/beds.orderBy('bedNumber')`, or a `collectionGroup('beds').where('branchId','==',id).where('status','==','available')` for a whole-branch board |

All of the above are backed by the composite/collection-group indexes in doc 09 §9.6
and doc 10 §10.8, and enforced by the rules in doc 12 — no additional API surface
required.

## 14.5 Why both Firestore notifications and FCM

Both are needed and serve different failure modes:

- **Firestore `notifications` documents** are the durable, queryable record — an
  in-app inbox that works even if the recipient never had push permission granted or
  the app wasn't installed at send time, and that survives across devices/reinstalls
  (list what happened, mark read/unread, badge counts).
- **FCM push** is the "wake someone up who isn't looking at the app right now"
  channel — a nurse's vitals-complete signal or a lab-report-ready alert needs to
  reach a doctor's phone even when their dashboard tab isn't open; Firestore
  `onSnapshot()` listeners only fire for clients that are currently subscribed.

`sendNotification(userId, type, payload)` (doc 02 §10) writes the Firestore document
and attempts the FCM push in the same call — the push is best-effort (never rolls
back the underlying business write on failure), the Firestore document is
authoritative.
