# HMS Architecture & Design Documentation

Enterprise multi-tenant Hospital Management System. This package is the complete
architecture/design deliverable produced before any implementation, per the approved
plan. Read in order — later documents assume decisions made in earlier ones.

1. [Requirement Analysis](./01-requirement-analysis.md)
2. [Missing Feature Analysis & Enterprise Additions](./02-missing-features.md)
3. [Improved End-to-End Workflow](./03-improved-workflow.md)
4. [Software Requirement Specification](./04-srs.md)
5. [Functional Requirements](./05-functional-requirements.md)
6. [Non-Functional Requirements](./06-non-functional-requirements.md)
7. [User Roles](./07-user-roles.md)
8. [Permission Matrix](./08-permission-matrix.md)
9. [Firestore Database Design](./09-firestore-design.md)
10. [Collection Schema](./10-collections-schema.md)
11. [Folder Structure](./11-folder-structure.md)
12. [Firestore Security Rules Design](./12-security-rules.md)
13. [Cloud Functions Inventory](./13-cloud-functions.md)
14. [API Design](./14-api-design.md)
15. [UI Wireframes](./15-ui-wireframes.md)
16. [Navigation Flow](./16-navigation-flow.md)
17. [Module Breakdown](./17-module-breakdown.md)
18. [Development Roadmap](./18-development-roadmap.md)
19. [Implementation Plan](./19-implementation-plan.md)

## Key decisions at a glance

- **Multi-tenancy**: nested subcollections under
  `hospitals/{hospitalId}/branches/{branchId}/...` for branch-operational data;
  `patients` and `users` remain flat top-level (global/ownership-scoped) — doc 09
  §9.1, superseding the earlier flat-everywhere decision; see doc 10 Migration
  Status for what this means for the current (still-flat) implementation.
- **Nurse role**: activated as a live Phase 1 role (vitals capture, ward care),
  no longer deferred — doc 07, doc 08.
- **Patient access**: web portal ships in Phase 1, not deferred to Phase 2 Flutter —
  doc 01 §1.5 (#2).
- **Slot generation**: automated from a recurring weekly template, doctor-approved —
  doc 02 §2.
- **Appointment lifecycle**: fully embedded in the appointment document (check-in,
  vitals, consultation summary as lifecycle fields; no separate `vitals` or
  `consultations` collections) — doc 10 §10.6.
- **Billing**: internal records only in Phase 1, no payment gateway — doc 01 §1.5 (#4).
- **Audit logging**: foundational infrastructure (Module 1), not a late module —
  doc 02 §8.
- **No hard deletes anywhere**: soft-delete via `status`, clinical data append-only —
  doc 02 §3.

## Status

Documentation complete, including the full collection schema (doc 10) and API design
(doc 14). **Doc 09's nested-hierarchy revision and the Nurse role activation are not
yet reflected in `firestore.rules`, `firestore.indexes.json`, or
`functions/src/callable/*`**, which still implement the earlier flat-collection,
Reception-captures-vitals design — migrating them is a follow-up implementation task,
not covered by this documentation pass (see doc 10's Migration Status section for the
full gap list). Implementation otherwise proceeds module-by-module per
[18-development-roadmap.md](./18-development-roadmap.md).
