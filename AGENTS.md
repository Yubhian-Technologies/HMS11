# AGENTS.md — HMS (Hospital Management System)

Enterprise multi-tenant Hospital Management System. Phase 1 is a web app
(Next.js + Firebase); Flutter mobile apps for Doctor and Patient are Phase 2
against the same backend. Full design docs live in [docs/](./docs) — this
file is a working summary for anyone (human or agent) touching the code.

## Tech stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces (`apps/*`, `functions`, `packages/*`) |
| Web app | Next.js 16.2.10 (App Router, Turbopack, RSC), React 19.2, TypeScript 5 (strict) |
| Styling | Tailwind CSS v4, shadcn/ui (`style: base-nova`, neutral base, `class-variance-authority`, `tw-animate-css`), `lucide-react` icons |
| Backend | Firebase: Firestore, Authentication (session cookies), Cloud Functions (Node 20, `firebase-functions` v6), Cloud Storage, Cloud Messaging |
| Validation | Zod v3 — one schema per collection/action, shared client+server |
| Shared code | `packages/shared` (types/validation/RBAC, consumed as compiled `dist/` by both `apps/web` and `functions`), `packages/shared-server` (server-only, e.g. the audited Firestore write service) |
| Local dev backend | Firebase Emulator Suite (Auth :9099, Firestore :8080, Functions :5001, Storage :9199, UI :4000) — all development targets the emulator, never production data |
| Deploy targets | Vercel (`apps/web`), Firebase (`firestore.rules`, `firestore.indexes.json`, `storage.rules`, `functions`) |

## Repo layout

```
apps/web/            Next.js app — all Phase 1 UI
  src/app/            route tree (see Routing below)
  src/features/<x>/    components/ hooks/ services/ actions/ validation/ — ALL business logic
  src/components/ui/   shadcn primitives
  src/lib/             firebase client init, auth/session helpers, nav config, utils
  src/server/          firebase-admin.ts (Admin SDK init for server actions/pages)
  src/proxy.ts          Next 16's "middleware" — cheap unauthenticated pre-check only
functions/            Firebase Cloud Functions (Node/TS)
  src/triggers/         Firestore-triggered (claims sync, status-change session revocation)
  src/callable/         httpsCallable endpoints (the bulk of writes)
  src/scheduled/        cron (slot generation, reminders, daily stats rollup)
packages/shared/      types/, validation/ (zod), rbac/ (permission matrix + scope helpers) — client+server safe
packages/shared-server/  writeWithAudit — the one path for audited Firestore writes; firebase-admin dependency, so it's a separate package to keep that out of the browser bundle
docs/                 01–19: requirements → SRS → roles → data model → security rules → API → wireframes → nav → modules → roadmap → implementation plan
```

Rule of thumb enforced throughout: `app/` route files are thin (call a
`features/*/hooks` hook or `features/*/actions` server action, never query
Firestore directly); all domain logic lives in `features/*/services`; every
non-draft Firestore write goes through `writeWithAudit` so audit logging
can't be forgotten.

## Auth & RBAC flow

1. **Sign-in** (`features/auth/services/login.ts`): client-side
   `signInWithEmailAndPassword` (Firebase Auth) → read the `role` custom
   claim off the resulting ID token → exchange the ID token for an httpOnly
   session cookie via a server action (`createSession`, Admin SDK
   `createSessionCookie`, 5-day expiry, cookie name `hms_session`).
2. **Every request**: `proxy.ts` (Next 16's renamed middleware) does a cheap
   cookie-presence check only — fast redirect to `/login` for the fully
   unauthenticated case. It does **not** verify the cookie.
3. **Every role-gated page**: that role folder's `layout.tsx` calls
   `requireRole([...])` (`src/lib/auth/require-role.ts`), which verifies the
   session cookie against the Admin SDK with `checkRevoked: true` — this is
   what makes force-logout-on-disable actually work — and redirects a
   role mismatch to that user's own home (`roleHome()`), never a 403 page.
   Both the proxy check and `requireRole()` must agree; a bug in one alone
   can't leak access.
4. **Claims sync**: `onUserCreateSetClaims` (Firestore trigger on
   `users/{uid}` create) mirrors `role`/`hospitalId`/`branchId` from the
   Firestore doc into the Auth custom claims — claims are the source of
   truth read by both `requireRole()` and Firestore Security Rules.
5. **Deactivation**: `onUserStatusChange` force-revokes sessions when a
   staff `users` doc flips to `status: disabled`.

### Roles (9 total, 8 active in Phase 1 — `nurse` reserved/deferred)

| Role | Scope claims | Home route |
|---|---|---|
| `super_admin` | none (platform-wide) | `/super-admin` |
| `admin` | `hospitalId` | `/admin` |
| `office` | `hospitalId`, `branchId` | `/office` |
| `reception` | `hospitalId`, `branchId` | `/reception` |
| `doctor` | `hospitalId`, `branchId` | `/doctor` |
| `pharmacy` | `hospitalId`, `branchId` | `/pharmacy` |
| `lab` | `hospitalId`, `branchId` | `/lab` |
| `patient` | none — ownership-scoped, cross-hospital | `/patient` |
| `nurse` | `hospitalId`, `branchId` | reserved, no UI yet |

Provisioning chain: `super_admin` is seeded manually (script, no in-app UI)
→ `super_admin` creates `admin` accounts → `admin` creates
`office`/`reception`/`doctor`/`pharmacy`/`lab` for their own hospital →
`patient` self-registers (or is created by `reception` for a walk-in).

## Routing (`apps/web/src/app`)

```
/                        → redirect: role home if signed in, else /login
/login, /signup          → (auth) route group, unauthenticated
/super-admin/*           → role: super_admin   (Hospitals · Analytics · Platform Settings*)
/admin/*                 → role: admin         (Dashboard · Staff · Departments · Rooms & Beds ·
                                                 Lab Test Master · Medicine Inventory · Settings ·
                                                 Billing Overview · Audit Logs* · Analytics)
/office/*                → role: office        (Slot Approval · Appointments · Emergency Queue* ·
                                                 Daily Schedule* · Waiting List*)
/reception/*             → role: reception     (Check-in · Vitals · Walk-in Booking · Billing)
/doctor/*                → role: doctor        (Queue · My Availability · My Patients* · Admissions;
                                                 Consultation Workspace is contextual, not a nav item)
/pharmacy/*              → role: pharmacy      (Prescription Queue · Inventory)
/lab/*                   → role: lab           (Order Pipeline · Test Master*)
/patient/*               → role: patient       (Home · Book · Appointments · Timeline · Prescriptions ·
                                                 Reports · Recovery Tracking · Feedback)
/notifications           → any authenticated role
```
`*` = nav item exists in the design (`docs/16-navigation-flow.md`) but has
no page yet — rendered as inert sidebar text, not a link
(`src/lib/nav-config.ts`).

A user hitting a route group that doesn't match their role is redirected to
their own home, never shown a 403. Cross-role handoffs (e.g. Office approves
→ appears on Reception's check-in list; Reception records vitals → appears
on Doctor's queue in real time) are Firestore listeners, not polling — see
`docs/16-navigation-flow.md` §16.3 for the full chain.

## Data model (Firestore)

- **Multi-tenancy**: flat top-level collections with `hospitalId`/`branchId`
  fields on every document (not per-hospital subcollections/databases) —
  keeps composite indexes O(1) in hospital count and lets Super Admin run
  cross-hospital queries. `branches` is the one exception, stored as a
  `hospitals/{id}/branches` subcollection.
- Every document (except `auditLogs`) carries `hospitalId`, `branchId`
  (nullable), `createdBy`, `createdAt`, `updatedAt`, `status`. No hard
  deletes anywhere — soft-delete via `status`, clinical data append-only.
- 18 modules → 18 collection families (`users`, `hospitals`/`branches`,
  `departments`, catalogs, `doctorSlots`, `patients`, `appointments`,
  `vitals`, `consultations`/`prescriptions`, `labOrders`/`labReports`,
  `medicineDispenses`, `admissions`/`beds`, timeline (read-only aggregation),
  `medicineLogs`/`healthUpdates`, `invoices`, `notifications`, `feedback`,
  `dailyStats`). Full schema: `docs/10-collections-schema.md`; relationship
  chains and indexing strategy: `docs/09-firestore-design.md`.
- Every write that isn't a UI-local draft goes through `writeWithAudit`
  (`packages/shared-server`) — creates the doc + an `auditLogs` entry
  atomically in one transaction.

## Cloud Functions (`functions/src`, exported from `index.ts`)

Grouped by module (18 total) — hospital/branch CRUD, staff & department
management, catalogs (wards/rooms/beds/lab tests/medicine inventory),
availability templates + rolling slot generation (nightly scheduled job,
3-day window), patient registration, appointment booking, check-in/vitals,
consultations, lab workflow, pharmacy dispensing, admissions/discharge,
recovery logging, billing, notifications (+ scheduled reminder dispatch),
feedback, and a scheduled daily-stats rollup for dashboard counters.

## Design system / colors

shadcn/ui, `base-nova` style, Tailwind v4 with CSS custom properties (OKLCH
color space) in `apps/web/src/app/globals.css`, full light/dark pairs via
`.dark` class. Radius base `0.75rem` (sm/md/lg/xl/2xl/3xl/4xl all derived
from it).

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` / `foreground` | `oklch(0.965 0.01 240)` / `oklch(0.22 0.025 240)` | `oklch(0.16 0.02 240)` / `oklch(0.97 0.005 240)` | page base |
| `primary` | `oklch(0.588 0.158 241.966)` (blue) | `oklch(0.746 0.16 232.661)` (lighter blue) | brand actions, active nav indicator |
| `card` / `popover` | near-white / near-white | `oklch(0.21 0.02 240)` | surfaces |
| `secondary`, `muted`, `accent` | pale blue-grays | dark blue-grays | secondary UI, hover states |
| `destructive` | `oklch(0.577 0.245 27.325)` (red) | `oklch(0.704 0.191 22.216)` | disabled/rejected badges, danger actions |
| `border` / `input` / `ring` | pale blue-gray | translucent white | outlines, focus rings |
| `chart-1..5` | blue ramp, light→dark | same ramp, adjusted | analytics charts |
| `sidebar*` (bg/fg/primary/accent/border/ring) | near-`background`, own accent | near-`background`, own accent | dashboard sidebar shell |

Everything is one hue family (blue, ~232–242° in OKLCH) at varying
lightness/chroma — no secondary brand color. Components read tokens via
Tailwind's `@theme inline` mapping (`bg-background`, `text-foreground`,
`bg-sidebar-accent`, etc.), never raw hex/oklch values in component code.

## Dev workflow

```
pnpm install
cp apps/web/.env.example apps/web/.env.local   # fill in Firebase client + Admin SDK config
pnpm emulators                                  # terminal 1 — Firebase Emulator Suite
pnpm dev                                        # terminal 2 — builds packages/shared, then next dev
```

Root scripts: `pnpm dev` (build shared → web dev server), `pnpm build`
(shared → functions → web, in dependency order), `pnpm typecheck` (shared
first, since `functions`/`apps/web` resolve it via compiled `dist/`, not
live TS), `pnpm lint`, `pnpm emulators`.

There is no in-app way to create the first account — a Super Admin must be
seeded via `functions`' `seed:super-admin` script before anyone can log in.

## Current status / known gaps

- Module 1 (Foundation: Auth/RBAC/audit) is implemented; every other role
  dashboard is scaffolded per `docs/18-development-roadmap.md` but many
  modules are still placeholder-to-partial (check a given role's `app/`
  pages against `docs/17-module-breakdown.md` for what's real vs. stubbed).
- `functions/scripts/seed-super-admin.mjs` is referenced by
  `functions/package.json` (`seed:super-admin`) and the root README but does
  not exist in the repo yet — blocks first login until written.
- Historical footgun: the root `.gitignore`'s `lib/` and `functions/.env.*`
  rules used to be too broad and silently dropped `apps/web/src/lib/*` and
  `apps/web/.env.example` from every commit. Fixed, but if a "module not
  found" error ever points at a plausible-looking file that simply isn't on
  disk, check `git status --ignored <path>` before assuming it was never
  written.

## Read next

- `docs/07-user-roles.md`, `docs/08-permission-matrix.md` — full RBAC.
- `docs/09-firestore-design.md`, `docs/10-collections-schema.md` — data model.
- `docs/11-folder-structure.md` — the structural rules this repo enforces.
- `docs/16-navigation-flow.md` — full nav/routing spec + cross-role handoffs.
- `docs/17-module-breakdown.md`, `docs/18-development-roadmap.md` — what's
  built vs. planned, and in what order.
