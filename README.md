# SavingForBonding

A FIFA World Cup football prediction game for a small group of friends. Users predict match outcomes and accrue beer "debts" for wrong picks, tracked on a leaderboard. See `CLAUDE.md` for the full architecture and engineering notes.

## Stack

- **Next.js 15** (App Router, Turbo mode)
- **Prisma + Turso** (libSQL) — both dev and production connect to a remote Turso database; there's no local SQLite workflow
- **tRPC** for the API layer
- **NextAuth v5** for authentication
- **Tailwind CSS v4**

## Running locally

**1. Install dependencies**

```bash
npm install
```

**2. Create your `.env` file**

```bash
cp .env.example .env
```

Fill in `TURSO_DATABASE_URL` and `TURSO_API_KEY` for the dev database (ask a teammate for these, or mint your own token — see "Turso CLI" below).

**3. Push the schema and seed data**

```bash
npm run db:push:turso
npm run db:seed
```

**4. Start the dev server**

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:seed` | Re-seed the database |
| `npm run db:push:turso` | Push schema changes to the Turso DB (dev by default; see `CLAUDE.md` for pushing to prod) |
| `npm run typecheck` | TypeScript type check |
| `npm run sync:fifa` | Manually pull latest FIFA fixture data |

## Turso CLI

```bash
turso auth login                          # one-time login (required before other commands)
turso db shell savingforbonding           # direct SQL access — dev DB
turso db shell savingforbonding-prod      # direct SQL access — production DB
turso db tokens create savingforbonding   # mint a new database auth token
```

## Environment variables

See `.env.example` for all available variables, and `CLAUDE.md` for the full dev/prod breakdown. Key ones:

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` / `TURSO_API_KEY` | Yes | Turso libSQL connection — dev and prod are separate databases |
| `AUTH_SECRET` | Production only | NextAuth secret |
| `ADMIN_PASSWORD` | No | Admin page password, default `admin123` |
| `CRON_SECRET` | Production | Auth for the Vercel cron that syncs FIFA fixtures daily |
| `DATABASE_URL` | Yes | Legacy SQLite placeholder kept for schema validation; unused once Turso vars are set |
