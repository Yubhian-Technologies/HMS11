# 04 — Software Requirement Specification (SRS)

## 4.1 Introduction

### 4.1.1 Purpose
This SRS defines the requirements for a multi-tenant, enterprise-grade Hospital
Management System (HMS). It governs Phase 1 (web application for hospital staff and
patients) and sets the backend contract that Phase 2 (Flutter mobile for Doctor and
Patient) will consume without modification.

### 4.1.2 Scope
The system manages the complete patient care lifecycle for any number of independent
hospitals on one platform: hospital onboarding, staff management, appointment
scheduling, clinical consultation, laboratory diagnostics, pharmacy dispensing, room/
bed/admission management, billing records, notifications, and audit/compliance
logging. See [01-requirement-analysis.md](./01-requirement-analysis.md) §1.6 for
explicit non-goals.

### 4.1.3 Definitions
- **Hospital**: a tenant on the platform; owns branches, staff, patients' visit data.
- **Branch**: a physical location belonging to a hospital.
- **Tenant isolation**: no hospital can read or write another hospital's data, at both
  the application layer and the Firestore Security Rules layer.
- **EMR**: Electronic Medical Record — the append-only clinical timeline of a patient.

### 4.1.4 References
[01-requirement-analysis.md](./01-requirement-analysis.md),
[02-missing-features.md](./02-missing-features.md),
[03-improved-workflow.md](./03-improved-workflow.md)

## 4.2 Overall description

### 4.2.1 Product perspective
Greenfield system. Web app (Next.js) is the system of record's primary interface in
Phase 1; Firebase (Auth, Firestore, Storage, Functions, FCM) is the entire backend —
there is no separate backend service to design, only Cloud Functions and Firestore
Security Rules as the enforcement layer. Phase 2 Flutter apps are additional clients
against the same Firebase backend; no backend changes are anticipated to support them
beyond possibly new callable functions for mobile-specific needs (e.g., push token
registration nuances).

### 4.2.2 Product functions
See [17-module-breakdown.md](./17-module-breakdown.md) for the full module list;
summarized in §4.3 below as functional requirements.

### 4.2.3 User classes
See [07-user-roles.md](./07-user-roles.md).

### 4.2.4 Operating environment
- Web: evergreen browsers (Chrome, Edge, Safari, Firefox — last 2 versions), desktop
  first (hospital staff on workstations), responsive down to tablet for
  reception/nursing-station use. Patient portal additionally responsive to mobile
  web.
- Hosting: Vercel (Next.js app + serverless/edge functions where used for
  server actions). Backend: Firebase (multi-region Firestore).

### 4.2.5 Design & implementation constraints
- TypeScript strict mode throughout (web app, Cloud Functions, shared package).
- No business logic in React components — all domain logic in `features/*/services`
  or `functions/src/services`, per [11-folder-structure.md](./11-folder-structure.md).
- All Firestore access from the client goes through Security Rules that enforce
  tenant isolation and RBAC independently of application code (defense in depth).
- Every collection carries `hospitalId`, `branchId`, `createdBy`, `createdAt`,
  `updatedAt`, `status` (see [10-collections-schema.md](./10-collections-schema.md)).

## 4.3 Functional requirements summary

See [05-functional-requirements.md](./05-functional-requirements.md) for the numbered,
testable requirement list.

## 4.4 Non-functional requirements summary

See [06-non-functional-requirements.md](./06-non-functional-requirements.md).

## 4.5 External interface requirements

- **Firebase Authentication**: email/password for staff (admin-provisioned, no public
  staff signup); email/password + optional phone OTP for patient self-registration.
- **Firebase Cloud Messaging**: push notifications to web (via service worker) and,
  in Phase 2, mobile.
- **Firebase Storage**: lab report files, medical certificate PDFs, profile photos,
  insurance documents — all access-controlled by Storage Security Rules mirroring
  Firestore's tenant/role model.

## 4.6 Assumptions & dependencies

- Stakeholder has an existing Firebase project on the Blaze plan (required for
  outbound network calls from Cloud Functions, e.g., FCM at scale).
- Vercel project will be connected to the same repo for the `apps/web` deployment.
- No existing hospital data to migrate — this is a net-new system.
