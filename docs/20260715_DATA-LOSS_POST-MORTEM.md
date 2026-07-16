# Post-Mortem: Production data loss (Vote / ChampionVote / Challenge / UserFollow)

**Date:** 2026-07-15
**Severity:** High — user-generated data (votes, champion picks, challenges, follows) was deleted in production.
**Status:** Resolved — all data restored, root cause identified and reproduced. Long-term fix implemented 2026-07-16: switched to a reviewed Prisma Migrate workflow (Proposed Solutions, option 1) with a mandatory fork-test for any prod migration that forces a table rebuild on a cascading table (option 2, kept as the safety net). See `CLAUDE.md` → "Database setup" for the resulting workflow.

## Summary

A routine production schema push (`npm run db:push:turso:prod`), made to add a single nullable-looking `termsAcceptedVersion` column to the `User` table, silently deleted every row in `Vote`, `ChampionVote`, `Challenge`, and `UserFollow` — 1343 votes, 14 champion votes, 3 challenges, and 6 follows. `User` and `Match` were untouched. No error, warning, or data-loss prompt was shown by Prisma; the CLI reported a clean success.

The trigger was `termsAcceptedVersion Int @default(1)` — a `NOT NULL` column, unlike every previous incremental addition to `User` (`nameUpdatedAt`, `termsAcceptedAt`), which were nullable. That difference forced Prisma into a table-rebuild path that, combined with a SQLite PRAGMA quirk, cascaded a full delete through every table with `ON DELETE CASCADE` pointing at `User`.

All data was recovered using Turso's point-in-time recovery (fork-at-timestamp) and reinserted into live production. No permanent data loss occurred, aside from one vote a user re-cast during the outage window, which was intentionally superseded by their original (restored) vote per an explicit decision made during recovery.

## Timeline (UTC, 2026-07-15)

| Time | Event |
|---|---|
| ~12:58 | Last confirmed-good state: `Vote`=1343, `ChampionVote`=14, `Challenge`=3, `UserFollow`=6 (verified later via point-in-time fork). |
| ~13:00–13:07 | `npm run db:push:turso:prod` run manually to add `termsAcceptedVersion` to `User`. This is the window in which the wipe occurred (bisected via successive point-in-time forks: 12:58 fork was clean, 13:07 fork was already empty). |
| 13:07 | Point-in-time fork at this timestamp shows `Vote`/`ChampionVote`/`Challenge`/`UserFollow` already at 0. |
| 13:11–13:12 | Vercel production build for the same feature (commit `67dc66b`, PR #58) runs and deploys — **after** the data was already gone. Build logs confirm this, ruling out the deploy itself as the trigger. |
| 13:14 | A user casts a vote (the app was still functioning — reads/writes to the now-empty `Vote` table worked fine, just returned empty results elsewhere). |
| ~13:19 | User reports "user data can't be loaded" on `/champion` and `/challenge`, "matches show no voters." |
| 13:19–14:xx | Investigation: row counts confirmed 0 votes live; point-in-time forks used to bisect the exact wipe window and rule out the Vercel deploy. |
| 14:xx | Recovery: forked prod at 12:58 (pre-incident), extracted `Vote`/`ChampionVote`/`Challenge`/`UserFollow` rows, reinserted into live prod (`INSERT`, with `INSERT OR REPLACE` for `Vote` to resolve one collision with a vote re-cast during the outage). Verified row counts matched pre-incident exactly. |
| 14:xx | Root cause investigation: reproduced the exact wipe twice on disposable forks by re-running the same push against a clean pre-incident copy. Captured full Prisma debug logs (`DEBUG=*`) to see the actual SQL executed. |
| 14:xx | All temporary fork databases and local scratch files (containing dumped user data) deleted. |

## Impact

- `Vote`: 1343 → 0 → restored to 1343 (one vote re-cast during the outage was overwritten by the user's original vote for that match; accepted trade-off, explicitly directed).
- `ChampionVote`: 14 → 0 → restored to 14.
- `Challenge`: 3 → 0 → restored to 3.
- `UserFollow`: 6 → 0 → restored to 6.
- `User` (20 rows) and `Match` (104 rows): never affected.
- Outage window (data missing from the app's perspective): roughly 13:07 to time of restore (~1 hour), though the wipe itself was instantaneous.

## Root Cause

1. The schema change was `termsAcceptedVersion Int @default(1)` added to `User` — a **`NOT NULL`** column with a default value.
2. Every previous incremental column addition to `User` (`nameUpdatedAt DateTime?`, `termsAcceptedAt DateTime?`) was **nullable**. SQLite can add a nullable column to an existing table with a plain `ALTER TABLE ... ADD COLUMN`, and Prisma's schema-engine takes that simple, safe path for such changes. That's why prior `User` schema changes never caused an issue.
3. Adding a `NOT NULL` column to an already-populated table is a case SQLite's `ALTER TABLE` can't always handle directly, so Prisma's schema-engine (running here via the JS engine + `@prisma/adapter-libsql` driver adapter, per `prisma.config.ts`) uses its standard "expand and contract" rebuild strategy instead:
   ```
   PRAGMA foreign_keys=OFF
   CREATE TABLE "new_User" (... including the new column ...)
   INSERT INTO "new_User" (...) SELECT (...) FROM "User"
   DROP TABLE "User"
   ALTER TABLE "new_User" RENAME TO "User"
   CREATE UNIQUE INDEX "User_email_key" ON "User"("email")
   PRAGMA foreign_keys=ON
   ```
   (Captured verbatim via `DEBUG=* npx prisma db push` against a disposable reproduction fork.)
4. SQLite documents that `PRAGMA foreign_keys` **is a no-op when set inside an open transaction** — it can only be toggled outside one. The driver adapter appears to run this entire rebuild sequence inside a single ambient transaction, so `PRAGMA foreign_keys=OFF` never actually takes effect.
5. With foreign-key enforcement still active, `DROP TABLE "User"` triggers SQLite's own `ON DELETE CASCADE` semantics for every table with a foreign key to `User` — which in this schema is `Vote`, `ChampionVote`, `Challenge`, and `UserFollow`. Their rows are deleted as a side effect of the `DROP`, not by any explicit statement Prisma issued (the debug log shows no operation at all against those four tables).
6. This fully explains every observed detail: only the four `ON DELETE CASCADE` children of `User` were emptied; `User` and `Match` (not a child of `User`) were untouched; the Prisma CLI showed no warning because its own diff genuinely only involved one step (rebuilding `User`); and the bug is deterministically reproducible.

**Confirmed by direct reproduction:** forked production from a verified clean pre-incident snapshot and re-ran the identical push twice against disposable forks. Both times, `Vote`/`ChampionVote`/`Challenge`/`UserFollow` went to 0 while `User`/`Match` stayed intact — the exact same signature as the real incident.

**Open question:** the dev database survived multiple pushes of this same change during the same session without any data loss, despite dev and prod having byte-identical schemas (verified via full `.schema` diff, including indexes). The likely explanation is that dev's `User` table was in a slightly different pre-push state that allowed a plain `ADD COLUMN` rather than a full rebuild — i.e., the trigger condition is "does this specific push force a rebuild of a table with cascading children," not "which database." This wasn't independently confirmed and is noted here as the leading theory, not a certainty.

## Detection & Recovery

- Detected by the user reporting broken pages in production shortly after a deploy.
- Turso's point-in-time recovery (`turso db create <name> --from-db savingforbonding-prod --timestamp <RFC3339>`) was used to fork the database at several candidate timestamps, bisecting the exact window in which the data disappeared, and to rule out the Vercel deploy itself as the cause (the deploy started after the data was already gone).
- The last clean fork (12:58 UTC) was dumped (`turso db shell <fork> ".dump"`), and the `INSERT` statements for the four affected tables were extracted and replayed against live production, restoring all rows. One `UNIQUE` conflict (a vote legitimately re-cast during the outage, for the same `(userId, matchId)` as a restored historical vote) was resolved with `INSERT OR REPLACE`, per an explicit decision to prioritize restoring historical data over the single new vote.
- All temporary fork databases and local files containing dumped production data (emails, password hashes, vote records) were deleted after recovery and after the root-cause reproduction was complete.

**Note on the recovery window:** Turso's point-in-time recovery on this plan is limited to the last 24 hours. Had this incident not been caught same-day, recovery would not have been possible this way.

## Fix Applied

- Live production data fully restored and verified against the pre-incident snapshot.
- No code or schema changes have been made yet to prevent recurrence — see below.

## Proposed Solutions (not yet decided)

The trigger condition is specific: **a schema change to a table that (a) forces Prisma's SQLite rebuild strategy, and (b) has one or more `ON DELETE CASCADE` children.** In this schema, `User` has four such children (`Vote`, `ChampionVote`, `Challenge`, `UserFollow`), so any future `NOT NULL` column addition (or other rebuild-forcing change) to `User` would repeat this exact incident. Options under consideration:

1. **Switch to a reviewed Prisma Migrate workflow** (`prisma migrate dev` to generate migration files, `prisma migrate deploy` for prod) instead of `prisma db push`. Migrate generates and prints the actual SQL for review before it ever touches production, and Prisma's own tooling flags rebuild/data-loss-risk steps explicitly — this class of change would be visible ahead of time instead of silently applied. Requires a one-time baseline of the current production schema as the initial migration.
2. **Keep `db push`, but always fork-test first.** Before any future prod schema push: fork prod, run the exact push against the fork, diff row counts on all cascading-child tables, and only push to live prod if nothing was lost. Zero setup cost, but depends on remembering to do it every time — no structural protection against forgetting.
3. **Report the underlying bug upstream** to Prisma / `@prisma/adapter-libsql`, since silently losing data with no warning during a routine `db push` is a correctness bug regardless of which workflow this project ultimately adopts.

These aren't mutually exclusive. A decision on which to adopt (or in what order) is deferred to a follow-up.
