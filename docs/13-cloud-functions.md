# 13 — Cloud Functions Inventory

All functions live in `functions/src/`, grouped by trigger type per
[11-folder-structure.md](./11-folder-structure.md). Business logic itself lives in
`functions/src/services/` (or `packages/shared` if identical logic is also needed by
`apps/web` server actions) — each function below is a thin trigger/handler that calls
into a service.

## 13.1 Auth triggers

| Function | Trigger | Purpose |
|---|---|---|
| `onUserCreateSetClaims` | Firestore `onCreate` on `users/{uid}` | Sets Firebase Auth custom claims (`role`, `hospitalId`, `branchId`) matching the new user document. |
| `onUserStatusChange` | Firestore `onUpdate` on `users/{uid}` where `status` changes | Revokes the user's refresh tokens when `status` flips to `disabled` (FR-1.4), forcing immediate logout. |

## 13.2 Scheduled functions

| Function | Schedule | Purpose |
|---|---|---|
| `generateRollingSlots` | Nightly, per-hospital timezone | Reads all `active` `doctorAvailabilityTemplates` + the branch holiday calendar, materializes `doctorSlots` for the new day entering the rolling 3-day window (FR-4.2). Idempotent: keyed by `(doctorId, date)`, skips if slots for that date already exist (NFR-2.2). |
| `dispatchAppointmentReminders` | Hourly | Sends FCM reminders for appointments starting within the configured lead time. |
| `dispatchMedicineReminders` | Every 15 min | Walks due `medicineLogs` entries (`status == pending`, `scheduledAt` due) and sends reminders; does not mutate status (patient action does — FR-14.1). |
| `dispatchFollowUpReminders` | Daily | Reminds patients of an upcoming `followUps.scheduledDate`. |
| `rollUpDailyStats` | Nightly | Recomputes the per-branch `dailyStats` denormalized counters (§9.7 of doc 09). |

## 13.3 Callable functions (client-invoked, `httpsCallable`)

Grouped by module; each validates the caller's custom claims against
[08-permission-matrix.md](./08-permission-matrix.md) before delegating to a service.
Full request/response contracts are in
[14-api-design.md](./14-api-design.md).

| Function | Module | Notes |
|---|---|---|
| `createHospital` | Hospital Mgmt | super_admin only; also creates the default Main Branch. |
| `assignHospitalAdmin` | Hospital Mgmt | super_admin only. |
| `createStaffAccount` | Staff Mgmt | admin only; creates Auth user + `users` doc + role-specific profile doc. |
| `approveDoctorSlots` | Scheduling | doctor (own) or admin (delegated). |
| `bookAppointment` | Appointments | patient (self) or reception (on behalf). |
| `approveAppointment` / `rejectAppointment` / `rescheduleAppointment` | Appointments | office only. |
| `checkInPatient` | Reception | reception only; generates token. |
| `recordVitals` | Reception | reception only. |
| `submitConsultation` | Consultation | doctor only; writes consultation + optionally prescription/labOrders/admission/followUp/certificate/referral as one transaction. |
| `advanceLabOrderStatus` | Laboratory | lab only; enforces sequential transition (FR-10.2). |
| `uploadLabReport` | Laboratory | lab only; also flips order to `reportUploaded` and notifies doctor+patient. |
| `dispenseMedicine` | Pharmacy | pharmacy only; decrements inventory, schedules `medicineLogs`. |
| `logMedicineStatus` | Recovery | patient only, own records. |
| `submitHealthUpdate` | Recovery | patient only, own records. |
| `assignBed` / `dischargePatient` | Admissions | doctor only; discharge requires a discharge summary payload (FR-12.3). |
| `recordPayment` | Billing | reception/admin only. |
| `submitFeedback` | Feedback | patient only, own completed appointments. |
| `resolveFeedback` | Feedback | admin only. |

## 13.4 Design notes

- **Every callable function's first line is an authorization check** against the
  permission matrix — never inferred from what the client claims to be.
- **All multi-document writes within one business action are Firestore
  transactions/batches**, not sequential unguarded writes (e.g., `submitConsultation`
  writing a consultation + prescription + lab orders together must not partially
  succeed).
- **Notifications are dispatched after the transaction commits**, via the shared
  `sendNotification` abstraction (NFR-10), and a failure to notify never rolls back
  the underlying business write (NFR-2.3).
- **No scheduled function does unbounded collection scans** — all query the relevant
  status/date index directly (e.g., `generateRollingSlots` queries only `active`
  templates, not all templates ever created).
