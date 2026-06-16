# SavingForBonding

A T3 Stack app for tracking savings and bonding activities.

## Stack

- **Next.js 15** (App Router, Turbo mode)
- **Prisma + SQLite** locally (or Turso for a remote libSQL DB)
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

The defaults work for local dev — SQLite is used by default, no Turso setup needed.

**3. Set up the database**

```bash
npm run db:setup
```

This runs `prisma db push` (creates the SQLite file) then seeds it with initial data.

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
| `npm run typecheck` | TypeScript type check |

## Environment variables

See `.env.example` for all available variables. Key ones:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path, default `file:./db.sqlite` |
| `AUTH_SECRET` | Production only | NextAuth secret |
| `ADMIN_PASSWORD` | No | Admin page password, default `admin123` |
| `FOOTBALL_DATA_API_KEY` | No | For live match data |
| `TURSO_DATABASE_URL` / `TURSO_API_KEY` | No | Use Turso instead of local SQLite |
