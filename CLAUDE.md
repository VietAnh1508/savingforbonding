# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

SavingForBonding is a FIFA World Cup football prediction game. Users predict match outcomes and accrue beer "debts" for wrong picks (tracked as points on a leaderboard). The app is a T3 Stack project: Next.js 15 (App Router), tRPC, Prisma, NextAuth, and Tailwind CSS v4.

## Commands

```bash
npm run dev          # Start dev server (Turbo mode)
npm run build        # Production build
npm run typecheck    # Type-check (only quality gate — no test suite)

npm run db:push      # Apply schema to DB without migration
npm run db:setup     # db:push + seed
npm run db:seed      # Re-seed the database
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Create a new Prisma migration
npm run db:migrate   # Apply pending migrations (production)

npm run sync:fifa    # Manually pull latest FIFA fixture data
```

There are no tests. `npm run typecheck` is the only automated check.

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — SQLite path (e.g. `file:./db.sqlite`) or Turso `libsql://` URL
- `AUTH_SECRET` — NextAuth secret (required in production)
- `ADMIN_PASSWORD` — Admin panel password (defaults to `admin123`)

Optional (Turso remote DB):
- `TURSO_DATABASE_URL` / `TURSO_API_KEY`

## Architecture

### Data layer

`prisma/schema.prisma` defines five models: `User`, `Match`, `Vote`, `Prediction`, `BettingRatio`. The database is SQLite locally; `src/server/create-prisma-client.ts` switches to Turso (`libsql://`) when `DATABASE_URL` starts with that prefix.

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

`src/server/services/fifa-api.ts` calls `api.fifa.com/api/v3`. There are no cron jobs; syncing is triggered manually via the admin panel or `npm run sync:fifa` (which runs `prisma/seed.ts`). The `/api/admin/sync-fifa` POST endpoint does the same and requires admin auth.

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

## Notes

- `TECHNICAL_BRIEF.md` documents an earlier design (PostgreSQL, OAuth, Football-Data.org API, Vercel crons). The actual implementation differs — trust the code, not the brief.
- Tailwind CSS v4 is fully set up — no `tailwind.config.js`. Theme tokens are defined in `src/styles/globals.css` using `@theme {}`. The PostCSS plugin is `@tailwindcss/postcss`.
