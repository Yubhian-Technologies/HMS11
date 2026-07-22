# 17 — Module Breakdown

Each module maps to a slice of [05-functional-requirements.md](./05-functional-requirements.md)
(FR-IDs noted) and will be implemented in the order fixed by
[18-development-roadmap.md](./18-development-roadmap.md). Per the approved plan,
every module ships with: Firestore collections touched, `packages/shared`
types/validation, Cloud Functions (if any), UI pages/components, business-logic
services, Security Rules for its collections, and tests — no module is considered
done without all seven.

| # | Module | FR-IDs | Primary collections |
|---|---|---|---|
| 1 | Foundation: Auth/RBAC/Audit | FR-1, FR-18 | `users` |
| 2 | Hospital & Branch Management | FR-2 | `hospitals`, `branches` |
| 3 | Staff & Department Management | FR-3.1–3.3 | `users`, `doctorProfiles`, `departments` |
| 4 | Hospital Settings & Catalogs | FR-3.4–3.6 | `branches` (timings), `holidays`, `wards`, `rooms`, `beds`, `labTestMaster`, `medicineInventory` |
| 5 | Doctor Availability & Slots | FR-4 | `doctorAvailabilityTemplates`, `doctorSlots` |
| 6 | Patient Registration & Portal | FR-5 | `patients` |
| 7 | Appointment Booking | FR-6, FR-7 | `appointments` |
| 8 | Reception & Vitals | FR-8 | `appointments` (check-in fields), `vitals` |
| 9 | Consultation Workspace | FR-9 | `consultations`, `prescriptions`, referenced writes into modules 10–12 |
| 10 | Laboratory Workflow | FR-10 | `labOrders`, `labReports` |
| 11 | Pharmacy Workflow | FR-11 | `medicineDispenses`, `medicineInventory` (decrement) |
| 12 | Admissions & Bed Management | FR-12 | `admissions`, `beds` |
| 13 | Patient Timeline / EMR | FR-13 | aggregation read layer over 6–12 |
| 14 | Recovery Tracking | FR-14 | `medicineLogs`, `healthUpdates` |
| 15 | Billing | FR-15 | `invoices` |
| 16 | Notifications | FR-16 | `notifications` |
| 17 | Feedback | FR-17 | `feedback` |
| 18 | Analytics | FR-19 | `dailyStats` (denormalized rollups) |

## Cross-cutting concerns (not standalone modules — built into every module above)

- **Audit logging** (FR-18): the `writeWithAudit` service from Module 1 is used by
  every subsequent module's write path, not reimplemented per module.
- **Security Rules**: each module adds its collections' rules to the shared
  `firestore.rules` file using the Module 1 scope helpers — no module introduces a
  new authorization pattern.
- **Follow-ups, medical certificates, referrals** (FR-9.6–9.8): implemented as part
  of Module 9 (Consultation Workspace), since they're all doctor actions taken from
  the same consultation screen, not separate modules.
