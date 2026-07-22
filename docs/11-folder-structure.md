# 11 — Folder Structure

pnpm workspace monorepo. Rationale in
[../plan reference: architecture plan]. Three independently-buildable packages
sharing one source of truth for types/validation/RBAC.

```
/HMS
├── apps/
│   └── web/                              Next.js App Router app (all Phase 1 UI)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/               login, patient signup — unauthenticated (route GROUP: no URL segment, children keep their own /login, /signup paths)
│       │   │   ├── super-admin/          hospitals, platform analytics — plain folder, becomes /super-admin/*
│       │   │   ├── admin/                staff, departments, settings, rooms/beds — /admin/*
│       │   │   ├── office/               slot approval, appointment approval, queues — /office/*
│       │   │   ├── reception/            check-in, vitals, walk-in booking — /reception/*
│       │   │   ├── doctor/               availability, queue, consultation workspace — /doctor/*
│       │   │   ├── pharmacy/             prescriptions, inventory — /pharmacy/*
│       │   │   ├── lab/                  orders, report upload — /lab/*
│       │   │   ├── patient/              booking, records, timeline, recovery tracking — /patient/*
│       │   │   ├── api/                  webhook-style routes only (rare — prefer server actions)
│       │   │   ├── layout.tsx
│       │   │   └── globals.css
│       │   ├── features/                 ALL business logic lives here, never in app/
│       │   │   └── <feature>/            e.g. appointments, consultations, billing
│       │   │       ├── components/       feature-scoped UI (dumb, presentational)
│       │   │       ├── hooks/             feature-scoped React hooks (data subscriptions)
│       │   │       ├── services/          domain logic — pure functions + Firestore calls
│       │   │       ├── actions/           Next.js server actions — thin, call services/
│       │   │       └── validation/        zod schemas re-exported from packages/shared where shared
│       │   ├── components/
│       │   │   └── ui/                    shadcn/ui primitives (button, dialog, table, ...)
│       │   ├── lib/
│       │   │   ├── firebase/              client SDK init, auth context, Firestore converters
│       │   │   └── utils/
│       │   ├── proxy.ts                    cheap unauthenticated-request pre-check (Next.js's "middleware" convention, renamed to proxy.ts in Next 16)
│       │   └── server/
│       │       └── firebase-admin.ts      Admin SDK init for server actions
│       ├── public/
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── functions/                            Firebase Cloud Functions (Node/TS)
│   ├── src/
│   │   ├── triggers/                     Firestore-triggered (onCreate/onUpdate)
│   │   │   ├── onUserStatusChange.ts     revoke sessions on disable
│   │   │   └── onWriteAuditLog.ts        NOT used — audit writes are synchronous in the shared write service, not trigger-based (avoids double-write races)
│   │   ├── callable/                     client-invoked (httpsCallable)
│   │   │   ├── approveAppointment.ts
│   │   │   ├── dispenseMedicine.ts
│   │   │   └── ...
│   │   ├── scheduled/
│   │   │   ├── generateRollingSlots.ts   nightly, FR-4.2
│   │   │   └── dispatchReminders.ts      medicine/appointment/follow-up reminders
│   │   ├── services/                     shared domain logic, mirrors apps/web/features/*/services
│   │   │   └── <feature>/
│   │   ├── notifications/
│   │   │   └── sendNotification.ts       single FCM implementation behind an abstraction, see 06 NFR-10
│   │   └── index.ts                      exports all functions
│   ├── package.json
│   └── tsconfig.json
│
├── packages/
│   ├── shared/                           client+server safe — imported by apps/web AND functions
│   │   ├── src/
│   │   │   ├── types/                    the interfaces in 10-collections-schema.md
│   │   │   ├── validation/               zod schemas — one per collection/action
│   │   │   ├── rbac/
│   │   │   │   ├── permission-matrix.ts  the data table behind 08-permission-matrix.md
│   │   │   │   └── scope.ts              platform/hospital/branch/ownership scope helpers
│   │   │   └── constants/                enums: appointment status, bed status, etc.
│   │   └── package.json
│   └── shared-server/                    server-only — imported by functions (and apps/web server actions), NEVER by client components
│       ├── src/
│       │   └── audit/
│       │       └── writeWithAudit.ts     the shared write-service (creates doc + auditLogs entry atomically via transaction)
│       └── package.json                  depends on @hms/shared + firebase-admin
│
│   Both are consumed as compiled output (dist/), not live TS source — required
│   so `functions`, which runs as plain compiled Node with no bundler, can
│   actually `require()` them after deploy (docs/19-implementation-plan.md §19.2).
│   `writeWithAudit` living in its own package rather than a subpath of
│   `shared` is a deliberate hard boundary: it depends on firebase-admin,
│   which must never end up in a browser bundle — a separate package makes
│   that structurally impossible instead of relying on import discipline.
│
├── docs/                                 this documentation package
│
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
├── .firebaserc
├── pnpm-workspace.yaml
├── package.json                          root — workspace scripts only
└── tsconfig.base.json
```

## Rules of the structure

1. **`app/` route files are thin.** A page/route component calls a hook from
   `features/*/hooks` or a server action from `features/*/actions` — it does not
   itself query Firestore, validate input, or branch on role logic.
2. **`services/` is the only place domain rules live** (e.g., "a lab order status can
   only move forward one stage at a time" — FR-10.2). Both `apps/web` server actions
   and `functions` callable/scheduled functions call into the equivalent service
   layer; where the logic is identical, it lives in `packages/shared` instead of
   being duplicated in both.
3. **Each plain `app/<role>/` folder maps 1:1 to a role** and is gated by that
   folder's `layout.tsx` calling `requireRole()`, which verifies the session
   (Firebase session cookie, checked server-side via the Admin SDK) and redirects
   unauthorized access before any page code renders — the permission matrix (doc 08)
   drives this gate, not ad hoc per-page checks. `proxy.ts` (Next.js's middleware
   convention, file renamed to `proxy.ts` in Next 16) does a cheap cookie-presence
   pre-check only — fast redirect for the fully-unauthenticated case — and does not
   itself verify the session. Full Admin SDK verification is deliberately kept in
   `requireRole()` instead, as a second independent layer: both checks must agree
   for a request to reach a page, so a bug in one can't alone leak access. Only
   `(auth)/` is a true route group (no URL segment) — used because `/login` and
   `/signup` already have their own explicit path segments and need no role gate.
4. **Every Firestore write that isn't purely a UI-local draft goes through
   `writeWithAudit`** in `packages/shared-server`, so audit logging (FR-18) can
   never be forgotten in a new feature.
