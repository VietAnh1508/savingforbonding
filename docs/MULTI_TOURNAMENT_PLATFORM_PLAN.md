# Multi-Tournament Platform Plan

Status: **draft — architecture decisions made (Part 3), nothing in this doc has been implemented.**

## Goal

Turn SavingForBonding from an app hardcoded to run one tournament (2026 FIFA World
Cup, fixtures from `api.fifa.com`, top scorer from vnexpress) into a platform that
can run any tournament, sourced from any data provider, by:

1. Standardizing the data model around a first-class `Tournament` entity.
2. Introducing an adapter layer so a new data source is a new adapter
   implementation, not a rewrite of sync/business logic.
3. Redesigning the UI so tournament identity is explicit (not implicit/singular).

This doc is the output of a dry run: a full click-through of the running app plus
a systematic code audit of the schema and services. It records what's coupled to
"the World Cup" today, the target architecture, and a phased migration plan. No
code or schema changes have been made yet.

---

## Part 1 — Current state (what's coupled, and how badly)

### 1.1 Schema-level coupling

There is **no `Tournament`/`Competition` model**. The closest things:

- `Match.tournament: String @default("FIFA World Cup")` — free text, not a
  foreign key. Nothing filters on it.
- `Stage.seasonId: String` — carries FIFA's season id, but is never queried
  against. A dead field.

Every query path (`match.list`, `leaderboard.*`, `rank-history`, insight charts)
treats the whole database as belonging to one tournament.

The three concrete blockers to running a second tournament without data loss or
corruption:

| Model | Problem |
|---|---|
| `User.totalPoints` | A single lifetime beer counter. A second tournament's results add directly onto the first's — no reset, no per-tournament breakdown. |
| `ChampionVote.userId` | `@unique` — **one row per user, ever.** A second tournament can't let a user pick a new champion without overwriting the first tournament's pick. |
| `TopScorerVote.userId` | Same `@unique(userId)` problem. |
| `GameSettings` | Explicit singleton (`id @default(1)`) — one global config row, not per-tournament. |

Six call sites hardcode exact FIFA World Cup stage names as magic strings to
drive business logic (voting deadlines, Final detection, candidate eligibility):
`champion-vote.ts:54`, `top-scorer-vote.ts:55`, `sync-fifa-fixtures.ts:75,161,191`,
`rank-history.ts:51`, `seed-stage.ts:8-15`. Any tournament with a different bracket
shape (different stage names, no "play-off for third place," a round-robin league)
silently breaks all six — deadlines default open, Final-detection never fires,
candidate lists never narrow.

### 1.2 FIFA adapter coupling — `src/server/services/fifa-api.ts`

- `FIFA_WORLD_CUP_SEASON_ID = "285023"` is baked into the fetch functions
  themselves (not a parameter), and the function names carry it too
  (`fetchWorldCupFixtures`).
- Response shapes (`FifaMatch`, `FifaStage`, numeric `MatchStatus` codes,
  `PlaceHolderA/B` bracket slots) are consumed as-is downstream — there's no
  normalization boundary between "what FIFA's API returns" and "what the app's
  business logic operates on."
- `src/lib/country-flag.ts` hardcodes a ~50-country `FIFA_CODES` table and a FIFA
  flag CDN URL. **`isKnownCountry()` is used as a silent filter gate** in
  `match.ts`'s `listMatches` and `leaderboard.ts`'s `bottomThreePicks` — any team
  not in this hardcoded FIFA namespace just disappears from the UI, no error.
  This is a landmine for any future adapter with a different team vocabulary.

### 1.3 vnexpress adapter coupling — `src/server/services/vnexpress-api.ts`

- Endpoint hardcodes `league_id=1`. Response parsing reaches into a
  vnexpress-specific shape (`data.data["1"].data`).
- The FIFA and vnexpress syncs are **not independent** — vnexpress candidate
  eligibility is gated by a FIFA `fetchQualifiedTeams` call
  (`sync-fifa-fixtures.ts:165-176`), and country-name reconciliation between the
  two sources happens via an ad hoc `getFifaCountryCode` bridge. A clean adapter
  design needs to decouple these into independent fetch/normalize passes.

### 1.4 Business logic — what's actually generic already

Good news: most of the beer/voting math in `src/lib/match.ts` and
`resolve-votes.ts` (vote lock window, win/lose/no-vote beer values, star-tier
multipliers, handicap-adjusted outcomes) is already tournament-agnostic — it
operates on generic stage-configurable penalties, not World-Cup-specific rules.
The coupling is concentrated in three places: the hardcoded stage-name lookups
(1.1), the FIFA/vnexpress adapters (1.2/1.3), and a handful of global constants
that should become per-tournament config: `CHAMPION_VOTE_BONUS`/
`TOP_SCORER_VOTE_BONUS`, `BEER_WIN/LOSE/NO_VOTE`, star-tier multipliers, and
`MATCH_DISPLAY_TIMEZONE = "Asia/Ho_Chi_Minh"`.

### 1.5 UI coupling

- **No tournament-scoping anywhere in routing.** Every route (`/`, `/champion`,
  `/top-scorer`, `/leaderboard`, `/rules`, admin panel) is flat and singular.
  There's no `/tournaments/[id]/...` layer, no tournament switcher, no "which
  tournament am I looking at" concept in the nav at all.
- **Champion and Top Scorer are hardcoded, separately-named, first-class
  features** — own routes, own components, own tRPC routers, own DB tables —
  rather than an instance of a generic "award/special-bet" concept. This is the
  single biggest structural UI coupling.
- Copy strings referencing "World Cup"/"FIFA" are scattered across ~15 files
  (sign-in page, admin banner, match tabs, rules page, etc.) — mechanical to fix,
  not architecturally significant.
- The Rules page bakes in a **7-stage escalating beer-penalty table** (First
  Stage → Round of 32 → ... → Final) tied to this exact tournament's knockout
  depth and naming.
- What's genuinely reusable already: the leaderboard, insight charts, and
  match-list/stage-grouping logic are data-driven off whatever `Stage` records
  exist, not hardcoded to a bracket shape. Dark/light theming already runs on
  CSS custom properties via `next-themes` — good infrastructure to extend to
  per-tournament branding. There's no component library (hand-built Tailwind
  throughout), so a redesign has a clean slate but no scaffolding to lean on.
- The accent color is *not* tokenized (raw `emerald-400/500/600` etc. scattered
  across components) — re-theming per tournament would need a broad
  find-replace today, not a token swap.

### 1.6 One more data point

`TECHNICAL_BRIEF.md` describes an earlier, more general design: a `League` model
(`externalId`, `name`, `logoUrl`) with `Match.leagueId`/`gameweek` and even a
weekly points reset. None of that exists in the actual schema — the real
implementation collapsed a more general design down to one hardcoded tournament.
Worth knowing this direction isn't new to the project.

---

## Part 2 — Target architecture

### 2.1 Data model

Add a first-class `Tournament` model and scope everything else to it:

```
Tournament
  id, slug, name, sportKind (default "football"), dataSourceKey
  timezone, startDate, endDate, status (upcoming/active/completed/archived)
  config (beer values, star tiers, vote bonuses — replaces today's global consts)

Stage.tournamentId          -> Tournament   (currently unused seasonId dropped)
Match.tournamentId          -> Tournament   (replaces free-text `tournament` field)
GameSettings.tournamentId   -> Tournament   (singleton becomes one row per tournament)
ChampionCandidate.tournamentId, TopScorerCandidate.tournamentId
ChampionVote:  @@unique([userId, tournamentId])   (was @unique(userId))
TopScorerVote: @@unique([userId, tournamentId])   (was @unique(userId))
```

`User` stays a single identity across tournaments (same friend group plays
every tournament), but per-tournament beer totals need their own home — see
Decision 3 below.

Replace the six hardcoded stage-name lookups with structural flags set when a
tournament's stages are seeded/synced, e.g. `Stage.isFinal: Boolean` and a
`Tournament.championVoteDeadlineStageId -> Stage` /
`Tournament.topScorerVoteDeadlineStageId -> Stage` pair — so "when does champion
voting lock" and "which match triggers award resolution" are data per
tournament, not string literals matched against stage names.

### 2.2 Adapter layer

Define an internal, source-agnostic domain shape (`NormalizedMatch`,
`NormalizedStage`, `NormalizedTeam`, `NormalizedAwardCandidate`) and two small
adapter interfaces:

```
FixtureSourceAdapter:  fetchStages(), fetchFixtures(), fetchQualifiedTeams()
AwardSourceAdapter:    fetchCandidates(awardKey)
```

`FifaWorldCupAdapter` implements `FixtureSourceAdapter` by wrapping today's
`fifa-api.ts` and mapping FIFA wire shapes into the normalized shapes (status
codes, bracket placeholders, localized names all get resolved here, not
downstream). `VnexpressTopScorerAdapter` implements `AwardSourceAdapter`
independently — no more reaching into FIFA's `qualifiedTeams` from inside the
vnexpress flow; both adapters read/write a shared normalized tournament state
instead of calling each other directly.

`Tournament.dataSourceKey` selects the adapter via a simple factory/switch —
**not** a plugin system. With one or two tournaments running at a time for ~40
users, a lookup table of 2-3 adapter implementations is the right amount of
engineering; don't build dynamic adapter discovery/registration.

Country/team vocabulary (today's hardcoded `FIFA_CODES` + `isKnownCountry()`
silent filter) becomes the adapter's responsibility, not a global gate — a
new adapter brings its own team/flag mapping, and unrecognized teams should
surface as a visible sync warning, not silently vanish from the UI.

### 2.3 UI

- Add tournament identity to the nav (a switcher/badge), collapsing to nothing
  extra when only one tournament is active — today's UX shouldn't get busier
  for the common case.
- Admin gets Tournament CRUD: create/configure a tournament (name, data source,
  timezone, stakes config), manage its stages, archive it when done.
- Past tournaments become browsable read-only history (leaderboard/insight
  scoped to a specific past tournament) — a natural feature unlocked by the
  data model change, not extra work.
- Tokenize the accent color (`--color-brand` or similar) so a tournament's
  branding can be swapped without a find-replace across components.
- Treat full visual modernization as an optional, separate track — it doesn't
  block or get blocked by the data-model/adapter work.

---

## Part 3 — Architecture decisions (made)

These were genuine forks the research surfaced. Reviewed with the user;
recommendations were confirmed as-is.

**Decision 1 — Concurrent or sequential tournaments? → Sequential only.**
Exactly one active tournament at a time, with past ones archived. Matches how
the group actually plays. Concurrent support is additive later, not a redesign,
if it's ever needed.

**Decision 2 — Generalize Champion/Top Scorer into an `Award` model, or just
scope the existing two tables? → Just scope the existing two.**
Add `tournamentId` to `ChampionVote`/`TopScorerVote` (and their candidate
tables) and fix the unique constraints. No generic `AwardCategory` abstraction
for now — build it only when a third award type actually shows up, per this
repo's "don't build for hypothetical scale" principle.

**Decision 3 — Per-tournament stats: reset or carry over? → Reset per
tournament.**
New `UserTournamentStats(userId, tournamentId, totalBeers, weeklyBeers, ...)`
join table; `User` keeps no running total of its own. "Who owes beer this
tournament" is the primary view. An all-time aggregate across tournaments can
be layered on top later as a nice-to-have, not required for v1.

**Decision 4 — Routing shape: `/t/[slug]/...` or flat routes + selector? →
Flat routes + an active-tournament selector.**
Routes stay as they are (`/leaderboard`, `/champion`, etc.); a cookie/query
param picks the active tournament, consistent with Decision 1. Smaller diff
than path-scoping every route. Revisit only if concurrent tournaments
(Decision 1) ever becomes real.

---

## Part 4 — Phased rollout

Each phase is meant to ship independently and keep the app working throughout
— no "big bang" cutover. **Migration safety check applies per phase, not just
once at the end**: per this repo's `CLAUDE.md`, for every migration in every
phase, check whether the generated `migration.sql` contains `CREATE TABLE
"new_*"` / `DROP TABLE` on `User` or one of its cascade children (`Vote`,
`ChampionVote`, `TopScorerVote`, `UserFollow`, and the new `UserTournamentStats`
if Decision 3 adds it) — if so, the fork-test against a forked prod DB is
mandatory before running it against real prod, per the post-mortem's lesson.
Nearly every phase below touches one of these tables, so expect this check to
fire repeatedly, not just once.

Good timing: the 2026 World Cup Final already completed (2026-07-20), so this
work lands in the gap between tournaments — migrating finished, static data,
not disrupting live play.

1. **Schema plumbing.** Add `Tournament`, add `tournamentId` FKs across
   `Stage`/`Match`/`GameSettings`/candidate tables (nullable → backfill single
   "FIFA World Cup 2026" row → required), fix the two `@unique(userId)`
   constraints per Decision 2/3. No behavior or UI change — purely additive
   plumbing, verified by typecheck + existing tests.
2. **Adapter extraction.** Refactor `fifa-api.ts`/`vnexpress-api.ts` behind the
   `FixtureSourceAdapter`/`AwardSourceAdapter` interfaces, introduce the
   normalized domain shapes, decouple the two sync flows, remove the silent
   `isKnownCountry()` filter gate. No behavior change — same data, cleaner
   seams. This phase is the direct payoff of Phase 1 and validates the schema
   design before UI work builds on it.
3. **Stage-name delookup.** Replace the six hardcoded stage-name string
   lookups with the structural flags from 2.1 (`isFinal`, deadline references).
   Behavior-preserving for the current tournament; unblocks any tournament
   with a different bracket shape.
4. **UI: tournament awareness.** Nav switcher/badge (collapsed when one
   tournament), admin Tournament CRUD, past-tournament read-only browsing.
   This is the first phase where the UI visibly changes.
5. **Visual modernization** (optional, parallel track). Token the accent
   color, revisit the Champion/Top-Scorer card designs, general polish. Doesn't
   block or depend on phases 1-4.

Recommended validation for the whole effort: once Phase 1-3 land, **use them to
onboard a second, smaller test tournament** (even a fake/dummy one) as the real
proof the adapter model works — better evidence than any amount of code review.

---

## Out of scope for this plan

- Concurrent-tournament support (deferred per Decision 1, revisit if needed).
- A generic multi-award model (deferred per Decision 2).
- Dynamic/plugin-based adapter loading — a hardcoded factory of 2-3 adapters is
  the right amount of engineering for this app's scale.
- Full visual redesign as a blocking requirement — tracked as an optional
  parallel phase.
