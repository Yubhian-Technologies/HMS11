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

- **Multi-tenancy**: flat top-level Firestore collections with `hospitalId`/
  `branchId` fields (not per-hospital subcollections or databases) — doc 09 §9.1.
- **Patient access**: web portal ships in Phase 1, not deferred to Phase 2 Flutter —
  doc 01 §1.5 (#2).
- **Slot generation**: automated from a recurring weekly template, doctor-approved —
  doc 02 §2.
- **Billing**: internal records only in Phase 1, no payment gateway — doc 01 §1.5 (#4).
- **Audit logging**: foundational infrastructure (Module 1), not a late module —
  doc 02 §8.
- **No hard deletes anywhere**: soft-delete via `status`, clinical data append-only —
  doc 02 §3.

## Status

Documentation complete. Implementation proceeds module-by-module per
[18-development-roadmap.md](./18-development-roadmap.md), starting with the repo
scaffold and Module 1 (Foundation: Auth/RBAC/Audit).
