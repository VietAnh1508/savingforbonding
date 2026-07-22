# Multi-Tournament Platform — Technical Plan & Progress Tracker

Companion to [`MULTI_TOURNAMENT_PLATFORM_PLAN.md`](./MULTI_TOURNAMENT_PLATFORM_PLAN.md), which
records the *why* and the architecture decisions. This doc tracks the *how far along*: concrete
subtasks per phase, checkboxes, and a short dated log. Update as work lands — don't let this drift
from reality.

## Status at a glance

| Phase | Description | Status |
|---|---|---|
| 1 | Schema plumbing | In progress — Tournament model + FKs done (dev + prod Turso); `UserTournamentStats`/`totalPoints` migration deferred as a separate task |
| 2 | Adapter extraction | In progress — `AwardSourceAdapter` + `VnexpressTopScorerAdapter` done; country/flag vocabulary done (dev + prod Turso); fixture-side adapter, factory, `isKnownCountry()` removal still pending |
| 3 | Stage-name delookup | Not started (partial stopgap landed — see Phase 1 notes) |
| 4 | UI: tournament awareness | Not started |
| 5 | Visual modernization (optional, parallel) | Not started |

Status values: `Not started` / `In progress` / `Blocked` / `Done`.

---

## Phase 1 — Schema plumbing

No behavior or UI change (except: the admin match form no longer has a manual "Tournament" text
field — tournament is now automatic).

- [x] `Tournament` model: `id`, `slug`, `name`, `sportKind` (default `"football"`), `dataSourceKey`,
      `startDate`, `endDate`, `status`. Excludes `timezone`/`config` — no reader for either yet
      (premature abstraction per this repo's `CLAUDE.md`).
- [x] `Stage.tournamentId`; dropped unused `Stage.seasonId`
- [x] `Match.tournamentId`; dropped free-text `Match.tournament`
- [x] `GameSettings.tournamentId` (singleton → one row per tournament)
- [x] `ChampionCandidate.tournamentId` / `TopScorerCandidate.tournamentId`, unique constraints
      scoped to `(externalId, tournamentId)` — closes a latent bug where a second tournament's
      candidate upsert could clobber a past tournament's row
- [x] `ChampionVote`/`TopScorerVote` unique constraints scoped to `(userId, tournamentId)`
- [ ] `UserTournamentStats(userId, tournamentId, totalBeers, weeklyBeers, ...)` join table
      (Decision 3 — reset per tournament) — **deferred**, touches live beer/points math across
      `resolve-votes.ts`/`points.ts`/`challenge.ts`/`leaderboard.ts`/`admin.ts`/`vote.ts`.
      `User.totalPoints` stays authoritative until this lands.
- [x] `getActiveTournamentId(db)` (`active-tournament.ts`) — single seam every read/write path uses
      to resolve "which tournament"; Phase 4 replaces it with a real cookie/selector lookup.
- [x] Stopgap ahead of Phase 3: the six hardcoded stage-name lookups (see Phase 3 below) now also
      filter by `tournamentId`, closing an immediate cross-tournament name-collision bug without
      removing the hardcoding itself.
- [x] Migrations `add_tournament_table` + `tighten_tournament_fks` — both force a full table
      rebuild (SQLite can't `ADD COLUMN ... FOREIGN KEY` in place). Fork-tested per CLAUDE.md
      before touching prod; applied to dev + prod Turso 2026-07-21, zero data loss.
- [x] `npm run typecheck` + `npm run test` pass; live smoke test against dev Turso confirmed no
      behavior change (admin match/GameSettings flows, a full FIFA sync, the new composite-unique
      vote upserts).

## Phase 2 — Adapter extraction

Same data, cleaner seams. Validates the Phase 1 schema before UI work builds on it.

- [x] `NormalizedAwardCandidate` type — `adapters/types.ts`
- [ ] Fixture-side normalized types: `NormalizedMatch`, `NormalizedStage`, `NormalizedTeam`
- [ ] `FixtureSourceAdapter` interface: `fetchStages()`, `fetchFixtures()`, `fetchQualifiedTeams()`
- [x] `AwardSourceAdapter` interface: `fetchCandidates(awardKey)` — `adapters/types.ts`. `AwardKey`
      is just `"topScorer"` for now; champion candidates are still 100% FIFA-sourced, no adapter
      needed yet.
- [ ] `FifaWorldCupAdapter` wrapping `fifa-api.ts` — **deferred**, fixture-side work
- [x] `VnexpressTopScorerAdapter` wrapping `vnexpress-api.ts` — decouples `sync-fifa-fixtures.ts`
      from vnexpress entirely (it now only reaches into `fifa-api.ts` for fixture-side data).
      Golden Boot tiebreak logic lives in its own `adapters/golden-boot.ts` (the award's rule, not
      vnexpress-specific). Tested (`vnexpress-top-scorer-adapter.test.ts`, 6 cases).
- [ ] `Tournament.dataSourceKey` selects the adapter via a small factory/switch (2-3 entries, not a
      plugin system)
- [ ] Move country/flag vocabulary (`FIFA_CODES`, FIFA flag CDN URL in `country-flag.ts`) into the
      adapter's responsibility. **Design decided 2026-07-22** (plan doc §2.1/2.2): no separate
      `Country`/ISO-3166 model — FIFA associations (England, Scotland, Kosovo, ...) don't map onto
      ISO-3166 countries. Instead each adapter stores its own source's native identifier at
      ingestion:
  - [x] `Match.homeCountryCode`/`awayCountryCode` — FIFA's `IdCountry`, stored at ingestion;
        existing rows self-backfill on next sync (no one-off script needed). `TeamFlag` takes an
        optional `code` prop to skip the name lookup when known. Migration is a plain nullable
        `ADD COLUMN` (no fork-test required). Applied to dev + prod Turso.
  - [x] `TopScorerCandidate.logoUrl` — vnexpress's `logo_team` field, stored at ingestion, same
        self-backfill pattern. `TeamFlag` gained an `imageUrl` prop (priority over `code`/`country`)
        so both flag sources share one component/shape instead of the UI duplicating render logic.
        Migration is a plain nullable `ADD COLUMN`. Applied to dev + prod Turso.
  - [x] `NormalizedAwardCandidate.countryCode` stays FIFA-specific on purpose — it's not for flag
        display, it's `syncTopScorerCandidates`'s eligibility bridge against FIFA's qualified-team
        list (vnexpress never emits its own code, so this cross-source matching need is separate
        from the codes/logo work above).
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

- [ ] Nav tournament switcher/badge — collapses to nothing extra when only one tournament is active
- [ ] Active-tournament selector via cookie/query param (Decision 4 — flat routes, no
      `/t/[slug]/...` path-scoping)
- [ ] Admin Tournament CRUD: create/configure (name, data source, timezone, stakes config), manage
      stages, archive
- [ ] Past-tournament read-only browsing: leaderboard/insight views scoped to a specific archived
      tournament
- [ ] Sweep ~15 files for hardcoded "World Cup"/"FIFA" copy (sign-in page, admin banner, match
      tabs, rules page, etc.)
- [ ] Rules page: replace the hardcoded 7-stage beer-penalty table with something data-driven off
      the active tournament's actual stages

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

Dated entries — major milestones only, newest first. Implementation detail lives in the checklist
above and in git history, not here.

- **2026-07-22** — `TeamFlag` gained an `imageUrl` prop so the top-scorer UI reuses it instead of
  duplicating flag-rendering logic. Committed `bfdbfa7`, pushed to `origin/develop`. Applied both
  pending country-vocabulary migrations (`add_match_country_codes`, `add_topscorer_candidate_logo_url`)
  to **prod Turso** — plain `ADD COLUMN`s, no fork-test required, zero data loss.
- **2026-07-22** — Country-vocabulary design implemented end-to-end: `Match.homeCountryCode`/
  `awayCountryCode` (from FIFA) and `TopScorerCandidate.logoUrl` (from vnexpress), replacing the
  `FIFA_CODES` name-lookup chain for match and top-scorer flags. Applied to dev Turso.
- **2026-07-22** — Country-vocabulary design decided (plan doc §2.1/2.2) — no ISO-3166 `Country`
  model; each adapter stores its own source's native identifier at ingestion instead.
- **2026-07-21** — Phase 2 started: `AwardSourceAdapter` + `VnexpressTopScorerAdapter` extracted,
  decoupling `sync-fifa-fixtures.ts` from vnexpress. Committed `ac827f9`, pushed to `origin/develop`.
- **2026-07-21** — Phase 1 schema (`Tournament` model + FKs) fork-tested and applied to **prod
  Turso** — zero data loss. `nightly-release.yml`'s daily develop→main auto-merge was a moot risk
  once this landed same-day as the code.
- **2026-07-21** — Phase 1 schema landed on **dev Turso**; `UserTournamentStats` follow-up and
  prod migration explicitly deferred at this point (both closed out in the entries above).
- **2026-07-21** — Progress tracker created from the plan doc. No implementation started yet.
