# 19 — Implementation Plan

## 19.1 Process for every module

Per the approved architecture plan, each module in
[18-development-roadmap.md](./18-development-roadmap.md) is implemented and
delivered as a complete, reviewable unit before the next one starts:

1. **Types & validation** — add/extend interfaces in `packages/shared/src/types`
   and zod schemas in `packages/shared/src/validation` for the module's collections
   (already drafted in [10-collections-schema.md](./10-collections-schema.md);
   implementation transcribes these into real `.ts` files).
2. **Security Rules** — extend `firestore.rules` with the module's collections using
   the existing scope helpers (doc 12); add matching `firestore.indexes.json`
   entries.
3. **Services** — implement the module's business logic in
   `apps/web/src/features/<feature>/services` and/or `functions/src/services`,
   routed through `writeWithAudit` for any persisted write.
4. **Cloud Functions** — implement any triggers/callable/scheduled functions the
   module needs (doc 13 is the checklist).
5. **UI** — build the pages/components in the relevant route group(s), per
   [15-ui-wireframes.md](./15-ui-wireframes.md) and
   [16-navigation-flow.md](./16-navigation-flow.md).
6. **Tests** — Firestore rules emulator tests (tenant isolation + role scope, per
   doc 12 §12.4), service-layer unit tests, and a manual browser walkthrough against
   the emulator (golden path + at least one edge case per FR in the module).
7. **Review checkpoint** — stop and report what was built before starting the next
   module, per the user's explicit "never generate the whole project in one
   response" instruction.

## 19.2 Environment & tooling setup (once, during scaffold)

- Package manager: pnpm (workspaces).
- `apps/web`: Next.js (App Router, TS strict), Tailwind CSS, shadcn/ui components
  added incrementally as each module needs them (not bulk-installed upfront).
- `functions`: Firebase Functions Node runtime, TS strict, deployed via `firebase
  deploy --only functions`.
- Local development: Firebase Emulator Suite (Auth, Firestore, Functions, Storage)
  — all module work is developed and tested against the emulator, never against
  production Firebase data.
- `.env.local` (web) / `functions/.env` — placeholders for the stakeholder's
  existing Firebase project config (API key, project id, etc.); populated by the
  user, not committed.
- Hosting: Vercel for `apps/web` (connected once the scaffold is pushed to a Git
  remote — not part of this repo's local setup).

## 19.3 What ships in Milestone 0 (immediately following this document)

- All 19 `/docs` files (this one included) + `docs/README.md` index.
- Full monorepo scaffold: `apps/web`, `functions`, `packages/shared`, root configs.
- Role-gated route-group shells in `apps/web` (empty dashboards, real middleware/
  auth-context wiring) — placeholder content, no business features yet.
- `firestore.rules`, `firestore.indexes.json`, `storage.rules` with the scope-helper
  skeleton from doc 12, plus rules for the one collection Module 1 needs (`users`).
- Root `README.md` with setup instructions (install, env config, running the
  emulator, running the dev server).

Module 1 (Foundation: Auth/RBAC/Audit) begins immediately after Milestone 0, as its
own reviewed delivery.
