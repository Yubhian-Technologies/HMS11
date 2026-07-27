# 14 — API Design

There is no separate REST/GraphQL API server. Two access patterns cover the entire
system, matching the "reusable backend for web and future Flutter" requirement:

1. **Direct Firestore reads** (client SDK, real-time listeners) for anything covered
   by Security Rules alone — list views, detail views, subscriptions to queue/vitals
   updates (NFR-3.3). No custom API needed for these; the rules in doc 12 are the
   entire authorization layer.
2. **Callable Cloud Functions** (`httpsCallable`, doc 13.3) for anything that is a
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
drift from it. Representative contracts:

```ts
// packages/shared/src/validation/appointments.ts
export const BookAppointmentRequest = z.object({
  doctorId: z.string(),
  date: z.string(),
  session: z.enum(["morning", "afternoon"]),
  patientId: z.string(),          // self, or specified by reception on behalf of a walk-in
  departmentId: z.string(),
});
export const BookAppointmentResponse = z.object({
  appointmentId: z.string(),
  status: z.literal("pending"),
});

// packages/shared/src/validation/consultations.ts
export const SubmitConsultationRequest = z.object({
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
  admission: z.object({ bedId: z.string() }).optional(),
  followUp: z.object({ scheduledDate: z.string() }).optional(),
}).strict();
export const SubmitConsultationResponse = z.object({
  consultationId: z.string(),
  prescriptionId: z.string().nullable(),
  labOrderIds: z.array(z.string()),
  admissionId: z.string().nullable(),
});

// packages/shared/src/validation/lab.ts
export const AdvanceLabOrderStatusRequest = z.object({
  labOrderId: z.string(),
  toStatus: z.enum(["sampleCollected", "processing", "completed", "verified"]),
});
```

## 14.2 Error contract

Every callable function throws a Firebase `HttpsError` with a stable machine-readable
`code`:

| Code | Meaning |
|---|---|
| `unauthenticated` | No valid ID token. |
| `permission-denied` | Authenticated, but role/scope check against doc 08 failed. |
| `failed-precondition` | Valid request, but domain state forbids it (e.g., advancing a lab order out of sequence — FR-10.2). |
| `invalid-argument` | zod validation failed; message includes the field path. |
| `not-found` | Referenced entity id doesn't exist or isn't visible to the caller. |

The web app maps these codes to consistent toast/inline error UI (doc 06 NFR-6.2) —
never a raw stack trace to the user.

## 14.3 Real-time subscriptions (not callable — direct listeners)

| View | Query pattern |
|---|---|
| Doctor's live queue | `appointments` where `hospitalId`+`branchId`+`doctorId`+`date == today`, ordered by check-in time/priority |
| Vitals visible to doctor instantly (FR-8.3) | `vitals` where `appointmentId == <current>` |
| Office daily schedule | `appointments` where `hospitalId`+`branchId`+`date == today` |
| Patient's own notification inbox | `notifications` where `userId == self`, ordered by `createdAt desc` |
| Bed availability board | `beds` where `hospitalId`+`branchId`+`wardId`, ordered by `bedNumber` |

All of the above are backed by the composite indexes in
[09-firestore-design.md](./09-firestore-design.md) §9.6 and enforced by the rules in
doc 12 — no additional API surface required.
