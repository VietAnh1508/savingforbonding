# Multi-Tournament Platform — Technical Plan & Progress Tracker

Companion to [`MULTI_TOURNAMENT_PLATFORM_PLAN.md`](./MULTI_TOURNAMENT_PLATFORM_PLAN.md), which
records the *why* and the architecture decisions. This doc tracks the *how* and *how far along*:
concrete subtasks per phase, checkboxes, and a dated log. Update the checkboxes and log as work
lands — don't let this drift from reality.

## Status at a glance

| Phase | Description | Status |
|---|---|---|
| 1 | Schema plumbing | In progress — Tournament model + FKs done (dev + prod Turso); `UserTournamentStats`/`totalPoints` migration deferred as a separate task |
| 2 | Adapter extraction | Not started |
| 3 | Stage-name delookup | Not started (partial stopgap landed — see Phase 1 notes) |
| 4 | UI: tournament awareness | Not started |
| 5 | Visual modernization (optional, parallel) | Not started |

Status values: `Not started` / `In progress` / `Blocked` / `Done`.

---

## Phase 1 — Schema plumbing

No behavior or UI change (except: the admin match form no longer has a manual "Tournament" text
field — tournament is now automatic). Verified by `npm run typecheck` + `npm run test` + a live
smoke test against dev Turso (see log below).

- [x] Add `Tournament` model: `id`, `slug`, `name`, `sportKind` (default `"football"`),
      `dataSourceKey`, `startDate`, `endDate`, `status`
      (`UPCOMING`/`ACTIVE`/`COMPLETED`/`ARCHIVED`). **Deliberately excludes** `timezone` (all
      users are in Vietnam today — a stored per-tournament timezone solves a problem that doesn't
      exist; revisit only if it ever does, and prefer browser timezone over a new column) and
      `config` (nothing reads it until the constants in `src/lib/match.ts` actually get migrated —
      an unused json column is premature abstraction per this repo's `CLAUDE.md`).
- [x] Add `Stage.tournamentId -> Tournament`; drop the unused `Stage.seasonId`
- [x] Add `Match.tournamentId -> Tournament`; drop the free-text `Match.tournament` field
- [x] Add `GameSettings.tournamentId -> Tournament` (singleton `id Int @default(1)` became one row
      per tournament, `id` is now `String @default(cuid())`)
- [x] Add `ChampionCandidate.tournamentId`, `TopScorerCandidate.tournamentId` — also changed their
      unique constraints to `@@unique([fifaTeamId, tournamentId])` /
      `@@unique([externalPlayerId, tournamentId])`, the same latent-bug fix the plan doc called
      out for the vote tables, one layer up (a bare `@unique` on an adapter-supplied external id
      would let a second tournament's candidate upsert silently clobber a past tournament's row)
- [x] Fix `ChampionVote`: `@unique(userId)` → `@@unique([userId, tournamentId])`
- [x] Fix `TopScorerVote`: `@unique(userId)` → `@@unique([userId, tournamentId])`
- [ ] Add `UserTournamentStats(userId, tournamentId, totalBeers, weeklyBeers, ...)` join table
      (Decision 3 — reset per tournament, `User` keeps no running total) — **deferred to a
      separate follow-up task.** Switching `User.totalPoints` reads/writes over to it touches
      live beer/points math across `resolve-votes.ts`, `points.ts`, `challenge.ts`,
      `leaderboard.ts`, `admin.ts`, `vote.ts` — real behavior-sensitive code, not schema plumbing.
      `User.totalPoints` is untouched and still authoritative for now.
- [x] New seam: `src/server/services/active-tournament.ts` — `getActiveTournamentId(db)` looks up
      the one `ACTIVE` tournament (Decision 1: sequential only). Every write/read path that needs
      "which tournament" now goes through this single function, which Phase 4's real
      cookie/selector-backed lookup will replace.
- [x] Stopgap (ahead of the real Phase 3 work): the `db.stage.findFirst({ where: { name: "..." }
      } })` lookups in `champion-vote.ts`, `top-scorer-vote.ts`, and `sync-fifa-fixtures.ts` (the
      exact six call sites Phase 3 targets) now also filter by `tournamentId`. This doesn't remove
      the hardcoded stage-name matching itself (still Phase 3's job) — it just prevents an
      immediate bug where a second tournament's identically-named stage (e.g. another
      "Semi-final") would silently match the wrong tournament the moment its stages are seeded.
- [x] Migration sequencing: two migrations (`add_tournament_table`, `tighten_tournament_fks`) —
      nullable FKs + backfill first, then required + drop old fields + unique-constraint changes.
      **Discovery vs. the original plan:** SQLite can't `ALTER TABLE ADD COLUMN` with a foreign
      key, so *both* migrations do the full rebuild-copy-drop-rename dance, not just the "tighten"
      one — the mandatory fork-test consideration (below) actually applies to both once this
      reaches prod, not only the second migration as originally assumed.
- [x] **Migration safety check** (per `CLAUDE.md`): both migrations rebuild `Stage`, `Match`,
      `GameSettings`, `ChampionCandidate`, `TopScorerCandidate`, `ChampionVote`, `TopScorerVote`.
      Hand-verified (not just reasoned about) against seeded scratch copies of `db.sqlite` with
      representative cascade-child rows (`StagePenalty`, `Vote`, `Challenge`) and a null-candidate
      vote / null-stage match, for both migrations independently — row counts and NULL counts on
      `ChampionVote.candidateId` / `TopScorerVote.candidateId` / `Match.stageId` unchanged before
      vs. after in every case. Applied to **dev Turso** 2026-07-21 with a before/after row-count
      diff on the real dev data (15 users, 307 votes, 104 matches, etc.) — zero loss. **Prod Turso
      migrated 2026-07-21**, per CLAUDE.md's mandatory fork-test: forked `savingforbonding-prod`
      into a throwaway `savingforbonding-prod-fork-20260721` db, applied both migrations to the
      fork, diffed row counts across all cascade-child + tournament-scoped tables against the real
      prod baseline (20 users, 1379 votes, 14 champion votes, 7 top-scorer votes, 6 follows, 3
      challenges, 104 matches — prod's dataset is larger than dev's) — zero loss, zero NULLs left
      in any `tournamentId` column, no duplicate `(userId, tournamentId)` pairs. Only then ran
      `npm run db:migrate:turso:prod` for real and re-verified the same counts against the live
      database — exact match. Fork destroyed after verification.
- [x] `npm run typecheck` and `npm run test` (27 tests) pass.
- [x] Live smoke test against dev Turso 2026-07-21: all public pages load; admin match
      create injects `tournamentId` automatically (no more manual tournament field); admin
      GameSettings upsert-by-`tournamentId` works; the champion-vote `@@unique([userId,
      tournamentId])` upsert was verified directly (creates once, updates in place on a second
      call — no duplicate); a full "Sync from FIFA" run against real data completed clean (104
      matches, 0 created/updated/104 unchanged — the whole refactored sync path exercised with
      zero drift).

## Phase 2 — Adapter extraction

Same data, cleaner seams. Validates the Phase 1 schema before UI work builds on it.

- [ ] Define normalized domain types: `NormalizedMatch`, `NormalizedStage`, `NormalizedTeam`,
      `NormalizedAwardCandidate`
- [ ] Define `FixtureSourceAdapter` interface: `fetchStages()`, `fetchFixtures()`,
      `fetchQualifiedTeams()`
- [ ] Define `AwardSourceAdapter` interface: `fetchCandidates(awardKey)`
- [ ] Implement `FifaWorldCupAdapter` wrapping `src/server/services/fifa-api.ts`; move status-code
      / bracket-placeholder / localized-name resolution into the adapter, not downstream code
- [ ] Implement `VnexpressTopScorerAdapter` wrapping `src/server/services/vnexpress-api.ts`;
      decouple from the FIFA `fetchQualifiedTeams()` call it currently reaches into
      (`sync-fifa-fixtures.ts:165-176`) — both adapters read/write shared normalized state instead
      of calling each other
- [ ] `Tournament.dataSourceKey` selects the adapter via a small factory/switch (2-3 entries, not
      a plugin system)
- [ ] Move country/flag vocabulary (`FIFA_CODES`, FIFA flag CDN URL in `src/lib/country-flag.ts`)
      into the adapter's responsibility
- [ ] Remove the silent `isKnownCountry()` filter gate in `match.ts` (`listMatches`) and
      `leaderboard.ts` (`bottomThreePicks`); unrecognized teams should surface a visible sync
      warning instead of vanishing
- [ ] Verify: same data as before, no behavior change

## Phase 3 — Stage-name delookup

Behavior-preserving for the current tournament; unblocks any tournament with a different bracket
shape.

- [ ] Add `Stage.isFinal: Boolean`
- [ ] Add `Tournament.championVoteDeadlineStageId -> Stage`
- [ ] Add `Tournament.topScorerVoteDeadlineStageId -> Stage`
- [ ] Replace hardcoded stage-name string lookups at each of the six call sites:
  - [ ] `champion-vote.ts:54`
  - [ ] `top-scorer-vote.ts:55`
  - [ ] `sync-fifa-fixtures.ts:75`
  - [ ] `sync-fifa-fixtures.ts:161`
  - [ ] `sync-fifa-fixtures.ts:191`
  - [ ] `rank-history.ts:51`
  - [ ] `seed-stage.ts:8-15`
- [ ] Verify against real current-tournament data: voting deadlines, Final detection, and
      candidate eligibility all behave the same as before the delookup

## Phase 4 — UI: tournament awareness

First phase where the UI visibly changes.

- [ ] Nav tournament switcher/badge — collapses to nothing extra when only one tournament is
      active
- [ ] Active-tournament selector via cookie/query param (Decision 4 — flat routes, no
      `/t/[slug]/...` path-scoping)
- [ ] Admin Tournament CRUD: create/configure (name, data source, timezone, stakes config), manage
      stages, archive
- [ ] Past-tournament read-only browsing: leaderboard/insight views scoped to a specific archived
      tournament
- [ ] Sweep ~15 files for hardcoded "World Cup"/"FIFA" copy (sign-in page, admin banner, match
      tabs, rules page, etc.)
- [ ] Rules page: replace the hardcoded 7-stage beer-penalty table (First Stage → Round of 32 →
      ... → Final) with something data-driven off the active tournament's actual stages

## Phase 5 — Visual modernization (optional, parallel track)

Doesn't block or depend on Phases 1-4.

- [ ] Tokenize the accent color (`--color-brand` or similar) — currently raw
      `emerald-400/500/600` scattered across components
- [ ] Revisit Champion/Top-Scorer card designs
- [ ] General polish pass

---

## Validation milestone

- [ ] Once Phases 1-3 land, onboard a second, smaller test tournament (even a fake/dummy one) as
      the real proof the adapter model works.

## Out of scope (per the plan doc — don't build these)

- Concurrent-tournament support
- A generic multi-award model
- Dynamic/plugin-based adapter loading

---

## Log

Dated entries — what happened, what was decided, what's blocked. Newest first.

- **2026-07-21** — Code committed (`ac827f9`) and pushed to `origin/develop`. Ran the mandatory
  fork-test before touching prod: forked `savingforbonding-prod` into a throwaway
  `savingforbonding-prod-fork-20260721`, applied both migrations to the fork, diffed row counts
  across every cascade-child and tournament-scoped table against real prod's baseline (20 users,
  1379 votes, 14 champion votes, 7 top-scorer votes, 6 follows, 3 challenges, 104 matches — a
  larger, higher-stakes dataset than dev's) — zero loss, zero `tournamentId` NULLs, no duplicate
  `(userId, tournamentId)` pairs. Ran `npm run db:migrate:turso:prod` for real immediately after,
  then re-verified the identical counts against live prod — exact match. Fork destroyed post-verify.
  **Prod Turso is now migrated**; both `add_tournament_table` and `tighten_tournament_fks` are
  applied there. Noted but deliberately not acted on: this repo's `nightly-release.yml` GitHub
  Action auto-merges `develop` → `main` daily at 22:00 ICT, which would have shipped
  `tournamentId`-dependent code to production ahead of the prod schema had this migration slipped
  past tonight's run — moot now that prod is migrated same-day.
- **2026-07-21** — Phase 1's `Tournament` model + FKs landed and applied to **dev Turso**
  (`fifa-world-cup-2026`, status `ACTIVE`). Scope explicitly excluded `UserTournamentStats`/
  `totalPoints` (separate follow-up — real behavior-sensitive change) and `Tournament.timezone`/
  `config` (no reader yet — premature abstraction). Discovered mid-implementation that SQLite's
  lack of `ALTER TABLE ADD COLUMN ... FOREIGN KEY` support means *both* migrations in this phase
  do full table rebuilds, not just the second one as the original plan assumed — so the
  post-mortem's mandatory fork-test applies to both once this reaches prod. Verified extensively
  before touching real data: hand-built scratch copies of `db.sqlite` seeded with representative
  cascade-child rows for both migrations independently (row counts + `candidateId`/`stageId` NULL
  counts unchanged before/after), then a live smoke test against dev Turso (admin match create,
  GameSettings upsert, a full FIFA sync run, and a direct test of the new composite-unique
  champion-vote upsert) — all clean, real dev data (15 users, 307 votes, 104 matches) unchanged in
  row count throughout. **Not yet done:** applying either migration to **prod** Turso (needs the
  fork-test first) or the `UserTournamentStats` follow-up.
- **2026-07-21** — Progress tracker created from the plan doc. No implementation started yet.
