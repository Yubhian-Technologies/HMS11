# HMS — Hospital Management System

Enterprise multi-tenant Hospital Management System. Web app (Phase 1) on
Next.js + Firebase; Flutter mobile apps for Doctor and Patient follow in
Phase 2 against the same backend.

**Start here:** [docs/README.md](./docs/README.md) — full architecture, SRS,
data model, and the module-by-module build order this repo follows.

## Status

Module 1 (Foundation: Auth, RBAC, audit logging) is implemented. Every other
role dashboard is a placeholder pending its module — see
[docs/18-development-roadmap.md](./docs/18-development-roadmap.md).

## Repo layout

```
apps/web/        Next.js app (all Phase 1 UI)
functions/        Firebase Cloud Functions
packages/shared/  Types, validation, RBAC — shared by apps/web and functions
docs/             Architecture & design documentation
```

Full rationale in [docs/11-folder-structure.md](./docs/11-folder-structure.md).

## Prerequisites

- Node.js 20+
- pnpm (this repo pins a version via `packageManager` in `package.json` —
  run any `pnpm` command through Corepack if you don't have pnpm installed
  globally: `corepack pnpm ...`)
- An existing Firebase project (Blaze plan, required for Cloud Functions) —
  Firestore, Authentication, Storage, and Cloud Messaging enabled
- The [Firebase CLI](https://firebase.google.com/docs/cli) for emulators/deploys

## Setup

1. Install dependencies:
   ```
   pnpm install
   ```
2. Configure environment variables:
   - Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in your
     Firebase project's client config and a service account's Admin SDK
     credentials.
   - Copy `functions/.env.example` to `functions/.env` — only needed if
     you'll run the super-admin seed script locally.
   - Set your real project id in `.firebaserc` (replace
     `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`).
3. Seed the first Super Admin account (there is no in-app way to create one
   — see [docs/07-user-roles.md](./docs/07-user-roles.md) §7.2):
   ```
   cd functions
   pnpm dlx dotenv -e .env -- pnpm seed:super-admin
   ```
   (or export the env vars in your shell and run `pnpm seed:super-admin`
   directly).
4. Run the Firebase emulators (Auth, Firestore, Functions, Storage):
   ```
   pnpm emulators
   ```
5. In a separate terminal, run the web app:
   ```
   pnpm dev
   ```
   Visit `http://localhost:3000`, sign in with the seeded Super Admin
   credentials, and you should land on `/super-admin`.

## Scripts (root)

| Command | Purpose |
|---|---|
| `pnpm dev` | Build `packages/shared`, then run the Next.js dev server (`apps/web`) |
| `pnpm build:shared` | Build `packages/shared` only |
| `pnpm build` | Production build of `packages/shared` → `functions` → `apps/web`, in dependency order |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages (builds `packages/shared` first — `functions` and `apps/web` resolve it via its compiled output, not its TS source) |
| `pnpm emulators` | Start the Firebase Emulator Suite |

`packages/shared` is consumed as compiled output (`dist/`), not live TypeScript
source — this is required so `functions` (plain compiled Node, no bundler at
runtime) can actually `require()` it after deploy. Re-run `pnpm build:shared`
after editing anything under `packages/shared/src` before `pnpm dev` picks up
the change.

## Deploying

- **Web**: connect this repo to Vercel, set the `apps/web/.env.example`
  variables as project env vars, and set the Vercel project's root directory
  to `apps/web`.
- **Firebase**: `firebase deploy --only firestore:rules,firestore:indexes,storage,functions`
  from the repo root (after `firebase login` and confirming `.firebaserc`
  points at the right project).
