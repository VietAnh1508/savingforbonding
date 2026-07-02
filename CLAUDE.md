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
npm run typecheck    # Type-check (only quality gate — no test suite)

npm run db:push:turso   # Apply schema to the Turso DB (dev or prod — see below)
npm run db:seed         # Re-seed the database
npm run db:studio       # Open Prisma Studio

npm run sync:fifa    # Manually pull latest FIFA fixture data
```

The dev server's default port is 3000. Before starting a new one to test UI changes, check whether it's already running there (e.g. `lsof -i :3000`) and reuse it — only run `npm run dev` if port 3000 is free.

### Database setup

**Both local dev and production use Turso** (there is no local SQLite workflow). Dev and prod are separate Turso databases under the `givemeakiss` org: `savingforbonding` (dev) and `savingforbonding-prod` (production). The only difference between pushing to dev vs. prod is which credentials are loaded:

| Environment | Credentials file  | Command |
|-------------|--------------------|---------|
| Dev         | `.env`             | `npm run db:push:turso` |
| Production  | `.env.production`  | `TURSO_DATABASE_URL="..." TURSO_API_KEY="<db-token>" npm run db:push:turso` |

`db:push:turso` loads `.env` automatically via `--env-file=.env`. For production, pass the `.env.production` values explicitly as shown above — inline env vars take priority over `--env-file` (Node doesn't overwrite already-set vars), so this correctly targets the prod DB instead. `db:push:turso` also runs `scripts/backfill-user-joining-dates.mjs` afterward (idempotent, safe to ignore).

The `TURSO_API_KEY` must be a **database auth token** (not a platform API token) — run `npm run turso:db-token` to mint one from a `TURSO_PLATFORM_TOKEN`, or use the Turso CLI directly (see below).

**Always push the schema before deploying code** that depends on new tables or columns.

There are no tests. `npm run typecheck` is the only automated check.

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

`prisma/schema.prisma` defines the data models: `User`, `Match`, `Vote`, `Prediction`, `BettingRatio`, `UserFollow`. Both dev and production use Turso (libSQL). `prisma.config.ts` loads the Turso adapter when `PRISMA_USE_TURSO=1` is set alongside valid `TURSO_DATABASE_URL` + `TURSO_API_KEY` — the `db:push:turso` script sets this automatically.

### API layer (tRPC)

All client–server communication goes through tRPC. Routers live in `src/server/api/routers/`:

| Router | Key procedures |
|--------|---------------|
| `match` | `listUpcoming`, `getById`, `getVoteDistribution` |
| `vote` | `cast` (mutation), `getMyVotes`, `getMyStats`, `getMyMissedMatches` |
| `leaderboard` | `global`, `weekly`, `totalBeerPool` |
| `admin` | `createMatch`, `updateMatch`, `deleteMatch`, `setBettingRatios` |

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

- **Automatic (daily):** A Vercel cron job hits `GET /api/cron/sync-fifa` at 12:00 ICT (05:00 UTC) every day. Auth is via `Authorization: Bearer <CRON_SECRET>` header. Configured in `vercel.json`.
- **Manual (on-demand):** Admin panel button POSTs to `/api/admin/sync-fifa` (requires admin cookie), or run `npm run sync:fifa` locally.

### Voting / beer logic

- Voting closes 5 minutes before kickoff (`VOTE_LOCK_MINUTES = 5` in `src/lib/match.ts`).
- Beer penalties: correct prediction = 1 beer, wrong = 3 beers, no vote on a completed match = 2 beers.
- `src/server/services/resolve-votes.ts` marks votes correct/incorrect — this is called manually, not triggered automatically when a match finishes.

### Path alias

`~/*` maps to `./src/*` (configured in `tsconfig.json`).

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
- Body: explain *why*, not what — omit if the subject line is self-explanatory

## Notes

- `TECHNICAL_BRIEF.md` documents an earlier design (PostgreSQL, OAuth, Football-Data.org API, Vercel crons). The actual implementation differs — trust the code, not the brief.
- Tailwind CSS v4 is fully set up — no `tailwind.config.js`. Theme tokens are defined in `src/styles/globals.css` using `@theme {}`. The PostCSS plugin is `@tailwindcss/postcss`.
