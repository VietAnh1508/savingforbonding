# Multi-Tournament Platform — Technical Plan & Progress Tracker

Companion to [`MULTI_TOURNAMENT_PLATFORM_PLAN.md`](./MULTI_TOURNAMENT_PLATFORM_PLAN.md), which
records the *why* and the architecture decisions. This doc tracks the *how* and *how far along*:
concrete subtasks per phase, checkboxes, and a dated log. Update the checkboxes and log as work
lands — don't let this drift from reality.

## Status at a glance

| Phase | Description | Status |
|---|---|---|
| 1 | Schema plumbing | In progress — Tournament model + FKs done (dev + prod Turso); `UserTournamentStats`/`totalPoints` migration deferred as a separate task |
| 2 | Adapter extraction | In progress — `AwardSourceAdapter` + `VnexpressTopScorerAdapter` done; `Match.homeCountryCode`/`awayCountryCode` done (dev Turso only); fixture-side adapter, factory, vnexpress `logoUrl`, `isKnownCountry()` removal still pending |
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

- [x] Define normalized award-side domain type: `NormalizedAwardCandidate` —
      `src/server/services/adapters/types.ts`
- [ ] Define normalized fixture-side domain types: `NormalizedMatch`, `NormalizedStage`,
      `NormalizedTeam`
- [ ] Define `FixtureSourceAdapter` interface: `fetchStages()`, `fetchFixtures()`,
      `fetchQualifiedTeams()`
- [x] Define `AwardSourceAdapter` interface: `fetchCandidates(awardKey)` —
      `src/server/services/adapters/types.ts`. `AwardKey` is currently just `"topScorer"` — champion
      candidates are 100% FIFA-sourced already (no third party to decouple from), so they don't
      need an adapter yet; extend the union if/when they get one
- [ ] Implement `FifaWorldCupAdapter` wrapping `src/server/services/fifa-api.ts`; move status-code
      / bracket-placeholder / localized-name resolution into the adapter, not downstream code —
      **deferred**, fixture-side work
- [x] Implement `VnexpressTopScorerAdapter` wrapping `src/server/services/vnexpress-api.ts` —
      `src/server/services/adapters/vnexpress-top-scorer-adapter.ts`. `fetchCandidates(awardKey)`
      is bare (no context param): it returns every candidate, sorted, with `countryCode` resolved
      per-candidate via the existing `getFifaCountryCode` helper. Decouples from the FIFA
      `fetchQualifiedTeams()` reach-in (was `sync-fifa-fixtures.ts:165-176`) — the adapter no longer
      imports `fifa-api.ts` at all; `syncTopScorerCandidates` still fetches qualified teams itself
      (fixture-side, unchanged) and does its own `countryCode` filter + top-N slice on the adapter's
      result, since that elimination-bracket knowledge belongs with the orchestrator, not baked into
      the adapter interface. Both `resolveTopScorerIfFinal` and `syncTopScorerCandidates` now go
      through the same `fetchCandidates("topScorer")` call and share `isTiedForGoldenBoot` — moved
      to its own `src/server/services/adapters/golden-boot.ts` rather than living in the vnexpress
      adapter file, since the Golden Boot tiebreak is the award's own rule, not something specific
      to vnexpress as a data source — instead of each call site re-deriving the tiebreak rule; the
      old `getTopScorers` memoization closure moved into the adapter as private per-instance state.
      Verified with a unit test (`vnexpress-top-scorer-adapter.test.ts`, 6 cases: sort order,
      tied-leader detection, country-code resolution, field mapping, invalid-award guard,
      single-fetch memoization) plus `npm run typecheck` and `npm run test` (33 tests total).
- [ ] `Tournament.dataSourceKey` selects the adapter via a small factory/switch (2-3 entries, not
      a plugin system)
- [ ] Move country/flag vocabulary (`FIFA_CODES`, FIFA flag CDN URL in `src/lib/country-flag.ts`)
      into the adapter's responsibility. **Design decided 2026-07-22** (see plan doc §2.1/2.2,
      updated same day) — confirmed against both live APIs first: no separate `Country`/ISO-3166
      model (FIFA associations like England/Scotland/Wales aren't ISO-3166 countries, so an ISO
      table would standardize on the wrong vocabulary). Instead each adapter stores its own
      source's native identifier at ingestion, since both already provide one for free:
  - [x] `Match.homeCountryCode`/`awayCountryCode` — **done 2026-07-22.** FIFA's `IdCountry`, read
        straight off the matches response (`FifaTeam.IdCountry` — `fifa-api.ts:22-26`, extracted
        via new `fifaTeamCountryCode()`) and stored at ingestion
        (`sync-fifa-fixtures.ts` create/update paths). `buildFifaMatchPatch`
        (`fifa-sync.ts`) gained a `mergeCountryCode` step and both fields feed its `changed`
        check, so existing rows backfill automatically on their next sync rather than needing a
        one-off script. Migration `20260722040406_add_match_country_codes` — two nullable
        `ADD COLUMN`s, no table rebuild (confirmed by reading the generated SQL), so no fork-test
        was required; applied to dev Turso. `TeamFlag` (`team-flag.tsx`) now takes an optional
        `code` prop and skips `FIFA_CODES`/`getFifaFlagUrl` entirely when given one; wired through
        `match-card.tsx`, `match-detail-modal.tsx`, `outcome-picker.tsx` (→ `day-predict-modal.tsx`;
        `vote-form.tsx`'s call site doesn't render flags at all, so left untouched) and
        `leaderboard-picks-banner.tsx` (required widening `leaderboard.bottomThreePicks`'s match
        `select` to include the new columns — `challenge.getCreateContext`'s matches are
        text-only, no flags rendered there, so left narrow). Verified with a live FIFA sync
        against dev Turso (104/104 matches updated in one pass — the expected one-time backfill,
        not drift) and a browser check of the Matches and Champion pages (flags render correctly,
        including FIFA "home nations" like England/Scotland which have no ISO-3166 equivalent —
        the reason 2.1 ruled out an ISO country table). **Add-on beyond the original ask:**
        `champion-vote-item.tsx` also switched to `candidate.countryCode` (from `teamName`) for
        its flag — `ChampionCandidate.countryCode` was already FIFA-sourced and unused for
        display, so this was free once `TeamFlag` grew the `code` prop. `npm run typecheck` and
        `npm run test` (33 tests) both pass; no test fixtures reference `FifaMatchPatch`/
        `buildFifaMatchPatch` so none needed updating. Not yet applied to **prod** Turso —
        pending explicit go-ahead per this repo's migration workflow.
  - [ ] `TopScorerCandidate.logoUrl` / `NormalizedAwardCandidate.logoUrl` — vnexpress's `logo_team`
        field (confirmed live, a per-team crest image URL, e.g.
        `"logo_team":"https://is.vnecdn.net/objects/teams/2.png?v=1"`), not currently typed on
        `VnexpressTopScorer` (`vnexpress-api.ts:4-10`). Replaces the
        `countryName -> FIFA_CODES -> flag-CDN` chain the top-scorer UI (`TeamFlag` via
        `top-scorer-vote-item.tsx:64`) uses today. Works the same for club or national logos, so
        it doesn't inherit the FIFA-specificity problem below. **Not done in this pass** — scoped
        as the FIFA-side change only; vnexpress/top-scorer side is still open.
  - [x] `NormalizedAwardCandidate.countryCode` stays as-is (still FIFA's 3-letter code via
        `getFifaCountryCode`) — confirmed unchanged. It's not for flag display anymore (once
        `logoUrl` above lands), it's specifically for `syncTopScorerCandidates`'s eligibility
        bridge against FIFA's `qualifiedTeams` `IdCountry` set. That cross-source reconciliation
        is inherent to vnexpress never emitting its own code, not something the codes/logoUrl
        above fix — so the field's FIFA-specificity (previously an open question in this doc) is
        fine to leave as-is; it isn't standing in for a general country vocabulary, just this one
        adapter's own matching need.
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

- **2026-07-22** — FIFA side of the country-vocabulary design (previous log entry, same day)
  implemented: `Match.homeCountryCode`/`awayCountryCode`, sourced from FIFA's `IdCountry` at
  ingestion instead of re-derived via `FIFA_CODES`. Schema: migration
  `20260722040406_add_match_country_codes` — reviewed the generated SQL first (two nullable
  `ALTER TABLE ... ADD COLUMN`s, no `CREATE TABLE "new_*"`/rebuild), so no fork-test was needed per
  CLAUDE.md's own rule; applied to dev Turso only, prod deliberately left untouched pending
  explicit go-ahead. Code: `fifa-api.ts` (`FifaTeam.IdCountry`, new `fifaTeamCountryCode()`),
  `fifa-sync.ts` (`mergeCountryCode`, both fields added to `FifaMatchPatch`'s `changed` check so
  existing null rows self-backfill on next sync rather than needing a script), `sync-fifa-fixtures.ts`
  (wires it into both the create and update paths). UI: `TeamFlag` (`team-flag.tsx`) takes an
  optional `code` prop and bypasses the name lookup when given one; wired through
  `match-card.tsx`, `match-detail-modal.tsx`, `outcome-picker.tsx` → `day-predict-modal.tsx`, and
  `leaderboard-picks-banner.tsx` (widened `leaderboard.bottomThreePicks`'s `select` for this —
  checked `challenge.getCreateContext` too, but its matches list is text-only, no flags, so left
  narrow). Verified: `npm run typecheck` + `npm run test` (33 tests) clean; a live `npm run
  sync:fifa` against dev Turso updated all 104 matches in one pass (the expected one-time
  null→code backfill, confirmed via `turso db shell` — 0 remaining NULLs on either column
  afterward), and a browser check of the Matches/Champion pages showed flags rendering correctly,
  including FIFA "home nations" (England, Scotland) that have no ISO-3166 code — living proof of
  why 2.1 ruled out an ISO country table. Folded in one small add-on beyond the original ask:
  `champion-vote-item.tsx` switched its flag from `candidate.teamName` to `candidate.countryCode`,
  since `ChampionCandidate.countryCode` was already FIFA-sourced and just sitting unused for
  display. Deliberately left for the separate, still-open vnexpress side: `TopScorerCandidate
  .logoUrl`, and the `isKnownCountry()` filter-gate removal in `match.ts`/`leaderboard.ts` (both
  still tracked as unchecked items above).
- **2026-07-22** — Country-vocabulary design decided (plan doc §1.2/1.3/2.1/2.2 updated; checklist
  above updated to match). Triggered by re-reading the live FIFA matches API
  (`api.fifa.com/api/v3/calendar/matches`) and vnexpress topscorer API directly — confirmed FIFA's
  matches response already carries `IdCountry`/`Abbreviation` per team (not just `fetchQualifiedTeams`,
  which was the only endpoint we'd previously read a code from), and vnexpress's response carries a
  `logo_team` crest-image URL, neither of which our current types (`FifaTeam`, `VnexpressTopScorer`)
  capture. Decision: no separate `Country`/ISO-3166 model — FIFA associations (England, Scotland,
  Wales, Northern Ireland, Chinese Taipei, Kosovo, ...) don't map onto ISO-3166 countries, so that
  table would standardize on the wrong vocabulary for a football platform. Instead, store each
  source's own native identifier directly at ingestion (`Match.homeCountryCode`/`awayCountryCode`
  from FIFA, `TopScorerCandidate.logoUrl` from vnexpress) — this fully removes the reverse
  name-lookup (`FIFA_CODES` + `isKnownCountry()`) for match data and top-scorer flag display.
  `NormalizedAwardCandidate.countryCode` stays FIFA-specific on purpose: it's solving a distinct,
  narrower problem (matching vnexpress's free-text `nationality` against FIFA's own qualified-team
  list for candidate eligibility), which isn't fixed by codes/logos sourced directly since vnexpress
  itself never emits a code. Doc-only change this session — no schema/code touched yet; still
  queued as unchecked Phase 2 subtasks above.
- **2026-07-21** — Phase 2 started, narrowly scoped to `AwardSourceAdapter` +
  `VnexpressTopScorerAdapter` only (match/fixture-side adapter work explicitly deferred to a later
  session). New `src/server/services/adapters/` module: `types.ts` (`AwardKey`,
  `NormalizedAwardCandidate`, `AwardSourceAdapter`) and `vnexpress-top-scorer-adapter.ts`. Routed
  both `resolveTopScorerIfFinal` and `syncTopScorerCandidates` in `sync-fifa-fixtures.ts` through
  the adapter's single `fetchCandidates("topScorer")` call — removed the direct `vnexpress-api.ts`
  import (`compareGoldenBoot`/`fetchTopScorers`/`VnexpressTopScorer`) from that file entirely; it
  now only reaches into `fifa-api.ts` for fixture-side data (`fetchQualifiedTeams`), not vnexpress.
  `fetchCandidates(awardKey)` is bare, matching the plan doc's own sketch — no filter/limit
  parameters. It returns every candidate sorted, with `countryCode` resolved per-candidate; eligibility
  filtering + the top-N slice moved to `syncTopScorerCandidates` itself, since "which teams remain"
  is elimination-bracket knowledge that belongs with the orchestrator, not baked as a special case
  into the adapter's interface. This also let `fetchQualifiedTeams()` and `fetchCandidates()` go
  back to running in parallel (`Promise.all`), matching the pre-refactor behavior. The Golden Boot
  tie-check (previously duplicated between `compareGoldenBoot`'s sort and an inline equality check)
  is now a single exported `isTiedForGoldenBoot` in its own
  `src/server/services/adapters/golden-boot.ts` — pulled out of the vnexpress adapter file since
  it's the award's own rule, not vnexpress-specific — used by both call sites. The per-sync-run
  vnexpress-fetch memoization that used to live as a `getTopScorers` closure threaded through
  `sync-fifa-fixtures.ts` moved into the adapter as private instance state instead. Added
  `vnexpress-top-scorer-adapter.test.ts` (6 tests: sort order, tied-leader detection, country-code
  resolution, field mapping, invalid-award guard, single-fetch memoization) as the actual parity
  evidence for this refactor, since typecheck and the pre-existing `rank-history` suite don't
  exercise this path at all. `npm run typecheck` and `npm run test` (33 tests total) both pass. Ran
  this design past a `/simplify` pass (4 parallel reviewers: reuse/simplification/efficiency/
  altitude) afterward — it caught the tie-check duplication and the filter/limit-as-special-case
  issue above, both fixed; also flagged the `AwardKey`-based multi-award dispatch as arguably
  premature, left as-is since it's literally the interface shape the plan doc specifies. Did not
  attempt the `dataSourceKey` factory/switch, moving `FIFA_CODES`/`isKnownCountry()` into the
  adapter, or removing the `isKnownCountry()` silent-filter gates — all explicitly out of scope for
  this pass per the plan doc's own checklist ordering, left for a follow-up (see the note added to
  the country-vocab checklist item above about `countryCode`'s current FIFA-specificity). No live
  `sync:fifa` dry run against Turso was done in
  this session.
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
