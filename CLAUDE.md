# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

SavingForBonding is a FIFA World Cup football prediction game. Users predict match outcomes and accrue beer "debts" for wrong picks (tracked as points on a leaderboard). The app is a T3 Stack project: Next.js 15 (App Router), tRPC, Prisma, NextAuth, and Tailwind CSS v4.

## Project Context & Engineering Principles

This is an internal app shared among a group of friends — at most ~40 users. It runs for the duration of the 2026 FIFA World Cup (through end of July 2026), roughly one month.

**Keep it simple.** This is not a public-facing product. Do not over-engineer: no need for rate limiting, complex caching strategies, multi-tenancy, advanced security hardening, or abstractions built for hypothetical scale. A solution that works cleanly for 40 users is the right solution.

**Keep it clean.** Simple does not mean hacky. Code should be readable, maintainable, and structured so new features or bug fixes are easy to add. Avoid shortcuts that create technical debt or make the codebase harder to reason about. Prefer straightforward patterns over clever ones.

## Commands

```bash
npm run dev          # Start dev server (Turbo mode)
npm run build        # Production build
npm run typecheck    # Type-check
npm run test         # Run the vitest suite

npm run db:migrate:new       # Author + review a migration locally (classic engine, local db.sqlite)
npm run db:migrate:turso     # Apply committed migrations to the Turso DB (dev or prod — see below)
npm run db:seed               # Re-seed the database
npm run db:studio             # Open Prisma Studio

npm run sync:fifa    # Manually pull latest FIFA fixture data
```

The dev server's default port is 3000. Before starting a new one to test UI changes, check whether it's already running there (e.g. `lsof -i :3000`) and reuse it — only run `npm run dev` if port 3000 is free.

### Working in a git worktree

A fresh worktree (e.g. `.claude/worktrees/<name>`) has no `node_modules` and no `.env`/`.env.production` — both are gitignored and only exist in the main checkout, so `npm run typecheck`, `npm run dev`, etc. fail there until set up. Run this once after entering a worktree:

```bash
npm run setup:worktree   # copies .env(.production) from the main checkout, then `npm install` (runs `prisma generate` via postinstall)
```

If you spin up a second dev server to test a worktree's changes without disturbing the one on port 3000, use a different port (`PORT=3001 npm run dev`) — the main checkout's server won't reflect the worktree's file changes.

### Database setup

**Both local dev and production use Turso** (there is no local SQLite workflow for the app itself — see below for the local file used only to author migrations). Dev and prod are separate Turso databases under the `givemeakiss` org: `savingforbonding` (dev) and `savingforbonding-prod` (production).

Schema changes go through **reviewed Prisma migrations**, not `prisma db push` — a `db push` of a `NOT NULL` column addition to `User` previously forced SQLite's table-rebuild path and silently cascade-deleted every row in `Vote`, `ChampionVote`, `Challenge`, and `UserFollow` (see `docs/POST-MORTEM.md`). Migrations generate reviewable SQL before anything touches Turso.

Workflow for any schema change:

1. `npm run db:migrate:new` — edit `prisma/schema.prisma`, then generate + apply the migration locally (classic engine, local `prisma/db.sqlite`, prompts for a migration name). **Review the generated SQL in `prisma/migrations/<ts>_<name>/migration.sql`** before committing — this is the step that would have caught the incident's rebuild-and-cascade.
2. Commit the new `prisma/migrations/` folder.
3. `npm run db:migrate:turso` — applies committed, unapplied migrations to the **dev** Turso DB (loads `.env`), then re-runs `scripts/backfill-user-joining-dates.mjs` (idempotent, safe to ignore).
4. Smoke-test against dev (`npm run dev`).
5. `npm run db:migrate:turso:prod` — same, against **production** (loads `.env.production`).

**Mandatory fork-test before any prod migration that forces a table rebuild** (`migration.sql` contains `CREATE TABLE "new_*"` / `DROP TABLE`) **on a table with `onDelete: Cascade` children** (currently `User`, whose children are `Vote`, `ChampionVote`, `Challenge`, `UserFollow`): fork prod with `turso db create <name> --from-db savingforbonding-prod`, apply the same migration to the fork, diff row counts on all cascading-child tables, and only proceed against real prod if nothing was lost. Prisma Migrate has been verified (see the plan this was implemented from) to not reproduce the original bug for one change shape on one Prisma version — it is not proof the underlying SQLite/driver-adapter behavior is fixed for every case, so this fork-test is the actual safety net, not a formality. Re-run it before any Prisma major-version upgrade too, since driver-adapter internals can change.

Both Turso databases were bootstrapped onto this migration history via a one-time baseline (`_prisma_migrations` table created manually, then `prisma migrate resolve --applied <init-migration>` — no SQL executed against the live schema). This is already done; you shouldn't need to repeat it unless a database is rebuilt from scratch.

`db:migrate:turso*` require `PRISMA_USE_TURSO=1` (set automatically by the script) plus valid `TURSO_DATABASE_URL` + `TURSO_API_KEY` — the `TURSO_API_KEY` must be a **database auth token** (not a platform API token); run `npm run turso:db-token` to mint one from a `TURSO_PLATFORM_TOKEN`, or use the Turso CLI directly (see below).

`npm run db:push` still exists for fast local prototyping (classic engine, local `db.sqlite` only) before finalizing a change into a migration — it never touches Turso, so it carries none of the incident's risk.

**Always apply migrations to Turso before deploying code** that depends on new tables or columns.

`npm run typecheck` and `npm run test` (vitest) are the automated checks. Test coverage is sparse and opt-in, not comprehensive — currently just `src/lib/rank-history.ts` (pure computation, no DB), which is exactly the kind of module worth unit-testing here: it replays beer/rank history from raw rows and has non-obvious edge cases (clamping order, all-in resolution, VN-timezone day bucketing) that are cheap to pin down with fixtures and easy to silently regress otherwise. Don't feel obligated to add tests for everything — most of this app (tRPC procedures, UI) is still verified by typecheck + manual smoke-testing per CLAUDE.md's "keep it simple" principle; add a test when a function has real logic worth pinning down independently of the DB/UI, not as a blanket rule.

### Turso CLI

```bash
turso auth login                          # one-time login (required before other commands)
turso db shell savingforbonding           # direct SQL access — dev DB
turso db shell savingforbonding-prod      # direct SQL access — production DB
turso db tokens create savingforbonding   # mint a new database auth token
```

## Environment Variables

Required in `.env` (dev) and `.env.production` (production, used only for local scripts targeting the prod DB — the deployed app's env vars live in the Vercel dashboard, not this file):

- `TURSO_DATABASE_URL` — Turso `libsql://` URL
- `TURSO_API_KEY` — Turso database auth token (not a platform API token)
- `AUTH_SECRET` — NextAuth secret (required in production)
- `ADMIN_PASSWORD` — Admin panel password (defaults to `admin123`)
- `CRON_SECRET` — Secret for Vercel cron job auth (generate with `openssl rand -hex 32`); set in the Vercel dashboard for the deployed app

Note: `DATABASE_URL` in `.env` is a legacy field kept for schema validation; the app always connects via `TURSO_DATABASE_URL`.

## Architecture

### Data layer

`prisma/schema.prisma` defines the data models: `User`, `Match`, `Vote`, `Prediction`, `BettingRatio`, `UserFollow`. Both dev and production use Turso (libSQL). `prisma.config.ts` loads the Turso adapter when `PRISMA_USE_TURSO=1` is set alongside valid `TURSO_DATABASE_URL` + `TURSO_API_KEY` — the `db:migrate:turso*` scripts set this automatically. Schema changes are authored as Prisma migrations, not `db push` — see "Database setup" above.

### API layer (tRPC)

All client–server communication goes through tRPC, except for file uploads — tRPC's JSON transport doesn't fit multipart bodies. Avatar upload (`src/app/api/user/avatar/route.ts`) is a plain Next.js Route Handler: it does its own `auth()` check instead of `protectedProcedure`, and validates/proxies the upload to Cloudflare R2 (`src/server/services/r2.ts`) directly. The FIFA sync admin routes under `src/app/api/admin/` follow the same non-tRPC pattern for cookie-based admin auth.

Routers live in `src/server/api/routers/`:

| Router        | Key procedures                                                      |
| ------------- | ------------------------------------------------------------------- |
| `match`       | `listUpcoming`, `getById`, `getVoteDistribution`                    |
| `vote`        | `cast` (mutation), `getMyVotes`, `getMyStats`, `getMyMissedMatches` |
| `leaderboard` | `global`, `weekly`, `totalBeerPool`                                 |
| `admin`       | `createMatch`, `updateMatch`, `deleteMatch`, `setBettingRatios`     |

Three procedure types are defined in `src/server/api/trpc.ts`:

- `publicProcedure` — no auth required
- `protectedProcedure` — requires NextAuth session (`UNAUTHORIZED` if missing)
- `adminProcedure` — requires admin cookie (separate from user session)

### Authentication

NextAuth v5 with an email/password credentials provider and JWT session strategy. No OAuth providers are configured. Password hashing via bcryptjs (`src/lib/password.ts`). Admin access is granted via a separate cookie checked in `src/lib/admin.ts`, not through the user session.

### Data fetching pattern

Pages are async server components that call `api.*.prefetch()` to populate the React Query cache, then render `<HydrateClient>`. Client components call `api.*.useQuery()` — this is the standard T3 hydration pattern. Mutations use `api.*.useMutation()` with `utils.*.invalidate()` on success.

### FIFA fixture sync

`src/server/services/fifa-api.ts` calls `api.fifa.com/api/v3`. Syncing happens two ways:

- **Automatic (daily):** A Vercel cron job hits `GET /api/cron/sync-fifa` once a day (Vercel's Hobby plan only allows one run per day per cron job). Auth is via `Authorization: Bearer <CRON_SECRET>` header. Configured in `vercel.json`.
- **Manual (on-demand):** Admin panel button POSTs to `/api/admin/sync-fifa` (requires admin cookie), or run `npm run sync:fifa` locally.

### Voting / beer logic

- Voting closes 5 minutes before kickoff (`VOTE_LOCK_MINUTES = 5` in `src/lib/match.ts`).
- Beer penalties: correct prediction = 1 beer, wrong = 3 beers, no vote on a completed match = 2 beers.
- `src/server/services/resolve-votes.ts` marks votes correct/incorrect. It's called from `syncFifaFixtures` whenever a sync sees a match newly transition to `COMPLETED` — so it runs on the same cadence as the FIFA sync above (daily cron, or on-demand), not the instant the match itself finishes.

### Path alias

`~/*` maps to `./src/*` (configured in `tsconfig.json`).

## GitHub Remote

This repo (`origin`, `VietAnh1508/savingforbonding`) is a fork of an upstream repo (`upstream`, `feiyang7641-png/savingforbonding`). All development — pushing branches, opening/managing PRs, issues, etc. — is scoped to `origin` only. Never push to, open PRs against, or otherwise modify `upstream`. When using `gh`, always target `origin` (e.g. `gh pr create` defaults to the fork's default branch, not upstream — double-check `--repo` / base branch if ever in doubt).

## Key Files

- `src/server/api/trpc.ts` — tRPC context, procedure factories, middleware
- `src/server/api/root.ts` — root router combining all sub-routers
- `src/lib/match.ts` — voting window and beer calculation logic
- `src/trpc/react.tsx` — client-side tRPC + React Query provider setup
- `prisma/schema.prisma` — complete data model

## Commit Convention

Follow Conventional Commits: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`

- Subject line: imperative mood, ≤72 chars, no trailing period
- Body: explain _why_, not what — omit if the subject line is self-explanatory

## Notes

- `TECHNICAL_BRIEF.md` documents an earlier design (PostgreSQL, OAuth, Football-Data.org API, Vercel crons). The actual implementation differs — trust the code, not the brief.
- `docs/POST-MORTEM.md` documents the production data-loss incident that motivated the migration-based workflow above.
- Tailwind CSS v4 is fully set up — no `tailwind.config.js`. Theme tokens are defined in `src/styles/globals.css` using `@theme {}`. The PostCSS plugin is `@tailwindcss/postcss`.
