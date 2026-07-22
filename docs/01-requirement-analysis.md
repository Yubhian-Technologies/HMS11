# 01 — Requirement Analysis

## 1.1 Purpose

Analyze the raw stakeholder spec for a multi-hospital Hospital Management System
(HMS) before committing to design. This document captures what was explicitly
requested, what was implied but not stated, and what conflicts needed resolution.
See [02-missing-features.md](./02-missing-features.md) for gap analysis and
[03-improved-workflow.md](./03-improved-workflow.md) for the resolved end-to-end flow.

## 1.2 Business goal

A SaaS-style HMS platform. A single deployment serves many independent hospitals
(multi-tenant), each with its own staff, patients, departments, and data — isolated
from every other hospital, but administrable from one platform-level Super Admin
layer. Phase 1 ships the web application; Phase 2 extends the same backend to Doctor
and Patient Flutter mobile apps without rewriting business logic.

## 1.3 Stakeholders / actors

| Actor | Scope | Phase |
|---|---|---|
| Super Admin | Platform-wide, all hospitals | 1 (web) |
| Admin | One hospital (all its branches) | 1 (web) |
| Office | One hospital/branch — scheduling | 1 (web) |
| Reception | One hospital/branch — front desk | 1 (web) |
| Doctor | One hospital/branch — clinical | 1 (web), 2 (mobile) |
| Pharmacy | One hospital/branch — dispensing | 1 (web) |
| Laboratory | One hospital/branch — diagnostics | 1 (web) |
| Patient | Cross-hospital (own records only) | 1 (web portal — see decision below), 2 (mobile) |
| Nurse | One hospital/branch — future | Deferred |

## 1.4 Explicit requirements extracted from spec

- Multi-tenant from day one: every record must carry `hospitalId` + `branchId`.
- Strict role hierarchy with non-overlapping responsibilities per actor above.
- Slot-based appointment scheduling, doctor-approved, 3-day rolling visibility window.
- Emergency patients bypass normal queue/slot logic entirely.
- Full clinical workflow: vitals → consultation → prescription → lab → pharmacy →
  recovery tracking → follow-up.
- Room/bed management with a status lifecycle (Available/Occupied/Reserved/
  Cleaning/Maintenance).
- Append-only medical timeline — "never delete medical history."
- Push notifications (FCM) at every meaningful state transition.
- RBAC enforced via Firebase Auth + Firestore Security Rules, plus audit/activity
  logging.
- Clean architecture: no business logic in UI, reusable services, feature-based
  folder structure, TypeScript throughout.

## 1.5 Ambiguities found and how they were resolved

| # | Ambiguity | Resolution | Where decided |
|---|---|---|---|
| 1 | Spec requires `branchId` on every doc, but describes Admin as owning "one hospital" with no branch concept defined. | Hospital → Branch is a first-class hierarchy. Admin manages one hospital and all its branches; branch-scoped staff (Office/Reception/Doctor/Pharmacy/Lab) are pinned to a single branch. | [02-missing-features.md](./02-missing-features.md) §1 |
| 2 | Spec's "Users" list for Phase 1 (web) does not include Patient, yet the workflow (steps 6–7) requires patient self-signup and self-booking from day one. | Phase 1 web includes a patient-facing portal. Phase 2 Flutter reuses the same backend for a mobile Patient app. | Confirmed with stakeholder during planning |
| 3 | Office is specified to manually create every 15-minute slot for the next 3 days, daily — operationally heavy and error-prone at multi-hospital scale. | Doctor/Admin define a recurring weekly availability template; a scheduled Cloud Function generates the rolling 3-day window automatically. Doctor approval gate is preserved. | [02-missing-features.md](./02-missing-features.md) §2 |
| 4 | "Consultation Fees" is listed as Admin-configured data, but no billing/invoicing workflow is described. | Phase 1 scope is internal billing records (invoice generation, payment status/method tracking, dues) — no payment gateway integration. Confirmed with stakeholder. | [02-missing-features.md](./02-missing-features.md) §4 |
| 5 | "Never delete medical history" is stated but no deletion/lifecycle mechanism is specified for any entity. | Every collection's mandatory `status` field is the sole deletion mechanism (`active`/`disabled`/`archived`). No hard deletes anywhere in the domain layer. | [02-missing-features.md](./02-missing-features.md) §3 |
| 6 | Audit Logs and Activity Logs are listed as a module (implying end-of-roadmap), but they are load-bearing for the "never delete" guarantee and RBAC accountability. | Treated as foundational infrastructure, built in Module 1 alongside Auth/RBAC, not as a late feature module. | [18-development-roadmap.md](./18-development-roadmap.md) |
| 7 | Feedback module is named but has no described workflow. | Post-visit patient rating + comment, with a complaint flag that routes to Admin. | [02-missing-features.md](./02-missing-features.md) §5 |

## 1.6 Explicit non-goals for Phase 1

- No payment gateway integration (billing is internal-record-only).
- No Nurse role (RBAC is designed to be extensible, but no Nurse UI/permissions ship).
- No Flutter code — Phase 1 is web-only; Phase 2 begins only after Phase 1 is stable.
- No insurance claims adjudication — insurance is a patient profile field only in
  Phase 1 (see [02-missing-features.md](./02-missing-features.md) §6 for the proposed
  future insurance workflow).
- No multi-language/i18n (not requested; UI copy is English-only for Phase 1).
