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
| 5 | Visual modernization (optional, parallel) | In progress — shadcn/ui initialized (Base UI), CSS tokens reconciled, `--primary` set to emerald; `SubmitButton` plus all card/button/badge components in Phase 5's list migrated to shadcn primitives (`Card`, `Button`, `Badge`); all seven hand-rolled modals migrated to shadcn `Dialog`, `useModalDismiss` deleted |

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
- [x] Upcoming tab empty state: distinguish "tournament finished" from "no matches yet" — checked
      against the active tournament's `endDate` (new `match.getActiveTournament` query) rather than
      inferring from `completed.length`, so a sync outage that empties the upcoming list mid-tournament
      doesn't get misreported as "finished". `Tournament.status` still has no writer to flip it to
      `COMPLETED`, so it wasn't usable as the source of truth here — revisit once Phase 4's tournament
      CRUD actually maintains that field.

## Phase 5 — Visual modernization (optional, parallel track)

Doesn't block or depend on Phases 1-4. Today there's no shared UI component
library at all — every card/button (`match-card.tsx`, `submit-button.tsx`,
`champion-vote-card.tsx`, `top-scorer-vote-card.tsx`, admin's `match-card.tsx`/
`user-card.tsx`, `challenge-card.tsx`, ...) is hand-rolled Tailwind, and raw
`emerald-400/500/600` classes are scattered across 46 files. Adopting
shadcn/ui is the vehicle for this phase's work, not a separate effort bolted
on top of it.

- [x] Decisions locked (rationale in the 2026-07-25 log entry): Base UI over
      Radix; `--fg`/`--card-bg` renamed to shadcn's `--foreground`/`--card`,
      `--bg-from`/`--bg-to`/`--toast-bg` stay app-specific.
- [x] Run `npx shadcn init` for real (no `--base radix`) — ran
      `shadcn@latest init --base base --defaults`. Aliases in
      `components.json` resolved to `~/*` correctly on their own; `hooks`
      alias hand-corrected from the CLI's default `~/hooks` to `~/app/hooks`
      to match this repo's existing `src/app/hooks/` convention.
- [x] In `globals.css`, rename `--fg` → `--foreground` and `--card-bg` →
      `--card` everywhere (`:root`, `html:not(.dark)`, `@theme inline`
      mappings); leave `--bg-from`/`--bg-to`/`--toast-bg` as-is. Also had to
      reconcile a layout mismatch the CLI introduced: shadcn's init wrote its
      light preset into `:root` and dark preset into `.dark` (its usual
      convention), but this app's `:root` is the *dark* default (avoids
      flash-of-wrong-theme before hydration) with `html:not(.dark)` as the
      light override — the opposite selector layout. Swapped the two preset
      blocks into the app's existing layout and deleted the now-redundant
      `.dark` selector block.
- [x] Point `--primary` at the app's accent color — set to `#10b981`
      (emerald-500) in both `:root` and `html:not(.dark)`, `--primary-foreground`
      to white. Left semantic success/error/warning colors (the `emerald-600`/
      `red-600`/`amber-600` used for "Correct"/"Wrong"/"No pick" states) alone —
      those are a different role (status color) than the primary action-surface
      color and shouldn't collapse into the same token.
- [x] Install shadcn primitives on demand, per component being migrated — not
      a speculative up-front `button`/`card`/`badge`/`dialog` install.
      `button` installed (came free with `init --defaults`).
- [x] Migrate hand-rolled components to shadcn primitives, highest-duplication
      first: `SubmitButton` + other ad hoc buttons → card components
      (`match-card.tsx`, `champion-vote-card.tsx`, `top-scorer-vote-card.tsx`,
      admin cards, `challenge-card.tsx`) → badges (`MatchStatusBadge`,
      `StarBadge`). No functional behavior change — star-picker, all-in
      checkbox, quick-vote button, etc. keep working identically (confirmed
      via typecheck, vitest, and a Playwright pass over Matches/Champion/
      Top Scorer/Challenge/Admin in both themes).
  - [x] `SubmitButton` → shadcn `Button` (`default` variant), original
        per-size padding/rounding preserved via override classes. Verified
        visually equivalent at rest in both themes on `/auth/change-password`;
        two intentional deltas from shadcn's own defaults, not chased for
        exact parity: `disabled:opacity-50` (was `-60`) and hover via
        `bg-primary/80` (opacity-based) rather than a solid `emerald-600` —
        both are shadcn's own convention, acceptable for a phase whose point
        is visual modernization.
  - [x] Installed shadcn `Card` and `Badge` primitives (`components/ui/card.tsx`,
        `components/ui/badge.tsx`). Converted every bordered content box in
        the listed files to `Card` (`match-card.tsx`, both vote cards' stakes
        banners/status boxes, admin's `match-card.tsx`/`user-card.tsx`,
        `challenge-card.tsx`), keeping the app's translucent `bg-foreground/5`
        surface (not shadcn's opaque `bg-card`) so the gradient background
        still shows through — the one thing decided *not* to let drift per
        the 2026-07-25 flexibility call below.
  - [x] Converted all ad hoc `<button>`s in those same files (plus the
        champion/top-scorer vote *item* rows, which live one level below the
        cards and own the "Pick"/"Picked" toggle) to shadcn `Button`, picking
        the closest semantic variant (`outline`/`destructive`/`default`/
        `ghost`/`secondary`) and overriding size via `h-auto` + explicit
        padding, same recipe as `SubmitButton`. Where a variant's own
        convention was a reasonable fit (e.g. challenge card's Accept →
        `default`, Reject → `destructive`'s softer tint instead of the old
        solid red/white), it was adopted as-is rather than chasing pixel
        parity — the user explicitly OK'd this mid-migration ("ok to tweak
        the UI a bit for shadcn, no need to keep the existing style exactly
        like before").
  - [x] `MatchStatusBadge` and the ad hoc status/count pills (challenge
        status + "Yours", champion "OUT", top-scorer goals count) → shadcn
        `Badge`, colors passed through as `className` overrides (Badge's own
        variants don't cover this app's per-status color set).
  - [x] `StarBadge` (in `star-picker.tsx`) deliberately left unchanged — it's
        a tooltip-wrapped star icon with no pill background, so wrapping it
        in `Badge` would add a pill and be a regression, not modernization.
  - Scope note: this pass covered exactly the files Phase 5 named above (plus
        the vote-item rows, which are those cards' own list-item template).
        Not touched: `quick-vote-button.tsx`, `vote-form.tsx`,
        `outcome-picker.tsx`, `day-predict-modal.tsx`, `confirm-dialog.tsx`,
        and the rest of the 46 files with raw `emerald-*` classes — those
        still use the app's original hand-rolled styling.
- [x] Revisit Champion/Top-Scorer card designs, once the `Card` primitive is
      in place — decided 2026-07-25: no further change. The stakes banner and
      the locked/eliminated status boxes already migrated to `Card` in the
      pass above. The candidate list itself (the `divide-y` container in
      `champion-vote-card.tsx`/`top-scorer-vote-card.tsx` and each
      `ChampionVoteItem`/`TopScorerVoteItem` row) stays a flush divided list
      on purpose, not a gap — `Card`'s own `flex flex-col gap-4` would break
      the flush divider styling, and a list is a genuinely different pattern
      from a card grid, not an unfinished migration. Turning each candidate
      row into its own elevated `Card` was considered and explicitly declined
      (top-scorer alone can have 7+ rows; that reads as noticeably more
      vertical space/scroll for no real gain over the current compact list).
- [ ] Further shadcn replacements identified by a 2026-07-25 scan of
      `_components/` (not started — scoped here so the work isn't lost, but
      deliberately not begun this pass). **Guiding rule for all of these:**
      when shadcn has an equivalent, remove the hand-rolled component
      entirely and use shadcn's directly — don't keep the custom one as a
      wrapper around it.
  - [x] Replaced the hand-rolled modal shape (fixed backdrop + centered panel
        + the shared `useModalDismiss` hook) with shadcn `Dialog` in all six
        named places (`confirm-dialog.tsx`, `terms-gate.tsx`'s `TermsModal`,
        `match/match-detail-modal.tsx`, `match/day-predict-modal.tsx`,
        `challenge/create-challenge-modal.tsx`, `challenge/edit-challenge-modal.tsx`)
        plus a 7th, structurally-identical consumer found during the sweep
        (`leaderboard/beer-amount-spin-modal.tsx`) — needed too, since leaving
        it hand-rolled would have kept `useModalDismiss` alive. `useModalDismiss`
        is deleted. `follow-confirm-dialog.tsx` (doesn't use the hook) was left
        alone and added as a new item below instead of folded into this pass.
        `dialog.tsx`'s generated `bg-popover`/`text-popover-foreground` swapped
        for `bg-card`/`text-card-foreground` app-wide (same reasoning as the
        Card pass: reuse the app's one surface token instead of introducing a
        second), and the overlay darkened from the CLI default (`bg-black/10`,
        barely visible) to `bg-black/50` to match every original modal's
        backdrop. `match/day-predict-modal.tsx` (the one bottom-sheet-on-mobile
        layout) bypasses `DialogContent` and composes `DialogPortal`/
        `DialogOverlay`/`DialogPrimitive.Popup` directly — `DialogContent`'s
        baked-in centered-dialog positioning classes (`top-1/2 left-1/2
        -translate-x/y-1/2`) would have fought a custom mobile-bottom/
        desktop-centered className rather than composing cleanly with twMerge.
        Two small, intentional behavior changes (all seven dialogs now also
        gain a real focus trap, which none had before):
        `create-challenge-modal.tsx`/`edit-challenge-modal.tsx` gain
        backdrop-click-to-close (their backdrop `<div>`s had no `onClick`
        before); `confirm-dialog.tsx` gains Escape-to-close and body-scroll-lock
        (it had neither). `TermsModal`'s non-dismissible gate mode (required
        terms not yet accepted) cancels every `onOpenChange` attempt
        (`eventDetails.cancel()`) rather than only Escape/backdrop, per Base UI
        v1.6's dismissal API — verified against Context7 docs before writing it,
        since a wrong guess there fails silently (no typecheck/test signal).
        Verified: `npm run typecheck` + `npm run test` pass; LSP
        `findReferences` confirms no orphaned imports across all 7 files; a
        live Chrome pass exercised `MatchDetailModal`, `ConfirmDialog` (via
        admin delete-user), `CreateChallengeModal`, and `TermsModal`'s
        dismissible path — Escape, backdrop-click, and the X/Close buttons all
        close correctly and don't fire real mutations. `DayPredictModal`'s
        mobile bottom-sheet layout was **not** live-verified — the Upcoming tab
        gates on the active tournament's `endDate` regardless of match data, so
        triggering it live would have required editing that field beyond a
        disposable test match; verified via code review + LSP instead.
        `BeerAmountSpinModal`'s spinning-lock dismissal-block and
        `TermsModal`'s non-dismissible path were verified by API/code review
        only (both require a fresh, not-yet-acted-on user state the current
        seeded data doesn't have).
  - [ ] `leaderboard/follow-confirm-dialog.tsx` still uses the old hand-rolled
        modal shape — it doesn't use `useModalDismiss` (no Escape/scroll-lock
        today), so it wasn't required for that hook's removal, but it's the
        same shape as `confirm-dialog.tsx` and should get the same `Dialog`
        treatment for consistency.
  - [ ] Replace the hand-rolled dropdown (manual click-outside/escape effect
        + absolutely-positioned panel) with shadcn `DropdownMenu` in
        `nav-client.tsx`'s account menu and `match/quick-vote-button.tsx` —
        two independent reimplementations of the same interaction.
  - [ ] Migrate the remaining `rounded-xl border-{color}/20 bg-{color}/5 p-4`
        info-banner boxes to `Card` (same pattern already applied everywhere
        Phase 5 named, just not yet in these files): `champion-voting-banner.tsx`,
        `top-scorer-voting-banner.tsx`, `beer-stakes.tsx`,
        `leaderboard-picks-banner.tsx`, `sign-in-prompt.tsx`, and the inline
        status boxes in `match/vote-form.tsx`.
  - [ ] Replace `tooltip.tsx` (hand-rolled `<div>` with manual
        `getBoundingClientRect` positioning) with shadcn `Tooltip`. Used by
        `StarBadge`, `AllInCheckbox`, admin `user-card`, and the top-scorer
        info icon. Likely fixes the pre-existing hydration bug noted above
        (`<p>` containing this tooltip's `<div>`) as a side effect, since
        shadcn's `Tooltip` renders via portal.
  - [ ] Replace `theme-toggle.tsx` and `match/outcome-picker.tsx` with shadcn
        `ToggleGroup` — both are textbook single-select segmented controls.
  - [ ] Replace `nav-client.tsx`'s `NavBadge` (challenge-count pill) with
        shadcn `Badge` — same small pill shape as the badges already
        migrated.
  - [ ] Replace the raw `<input type="checkbox">`s (all-in checkbox in
        `match/vote-form.tsx`, "show all candidates" in
        `champion-vote-card.tsx`) with shadcn `Checkbox`.
  - Explicitly declined, not planned: `toast.tsx` (a full custom toast
        system with its own state/portal/timers — swapping it is an
        infrastructure change, not a reskin); `match/match-tabs.tsx`'s sticky
        header/date-pill bar (scroll-spy, edge-fade overflow masks, deep-link
        sync are genuinely custom — a `Tabs` primitive wouldn't reduce real
        complexity here); `footer.tsx`/`back-link.tsx` (trivial, no
        duplication to justify it); presentational-only components
        (`team-flag.tsx`, `ratio-display.tsx`, icons, `user-avatar.tsx`, etc.)
        — nothing shadcn addresses there.
- [ ] General polish pass
- [ ] Verify: `npm run typecheck` passes; cold-load the app in both light and
      dark mode and confirm no flash-of-wrong-theme; manually re-check the
      interactive bits of every migrated component (star-picker, all-in,
      quick-vote, admin card actions) still behave the same as before.

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

Dated entries, newest first. **Convention: keep each entry to 1-2 lines** — state what changed
and the one key decision/gotcha worth remembering, not the full reasoning chain or file-by-file
blow-by-blow. The checklist items above (and git history / commit messages) are the source of
truth for detail; if an entry needs a third line, that detail probably belongs up there instead.

- **2026-07-25** — Migrated all seven hand-rolled modals to shadcn `Dialog`, deleted
  `useModalDismiss`. `day-predict-modal.tsx` bypasses `DialogContent` (bottom-sheet layout
  fights its centered-dialog defaults); `dialog.tsx` repointed to `bg-card` and a darker overlay
  to match the app's existing convention. Two small behavior gains (backdrop-click on the
  challenge modals, Escape/scroll-lock on `ConfirmDialog`) plus a focus trap everywhere — see
  checklist entry for the full verification breakdown.
- **2026-07-25** — Fixed `tooltip.tsx` hydration bug: wrapper `div` → `span`, since a `div` isn't
  valid inside `MatchCardFooter`'s `<p>`. The shadcn `Tooltip` replacement is still a separate,
  not-started item below.
- **2026-07-25** — Scanned `_components/` for further shadcn candidates; added as new, not-started
  checklist items below (Dialog, DropdownMenu, more Card conversions, Tooltip, ToggleGroup, Badge,
  Checkbox), with a guiding rule to replace hand-rolled components outright rather than wrap them.
- **2026-07-25** — Fixed a `user-card.tsx` bug: shadcn `Card`'s `overflow-hidden` let it get
  squeezed below its content height inside a scrollable flex list — needed `shrink-0`. Also decided
  the champion/top-scorer "revisit card design" item needs no further change; see checklist.
- **2026-07-25** — Migrated the rest of Phase 5's named components (match/champion/top-scorer/
  admin/challenge cards) to shadcn `Card`/`Button`/`Badge`, keeping the app's translucent
  `bg-foreground/5` surface instead of shadcn's opaque `bg-card` so the gradient background still
  shows through.
- **2026-07-25** — Phase 5 foundation: ran `shadcn init`, fixed the CLI's inverted light/dark
  preset layout and a font regression it introduced, migrated `SubmitButton` as proof-of-concept.
- **2026-07-25** — Phase 5 planned: Base UI chosen over Radix as the primitive library; partial
  CSS token rename decided (`--fg`/`--card-bg` → shadcn's `--foreground`/`--card`).
- **2026-07-24** — Matches "Upcoming" tab empty state now distinguishes tournament-finished from
  no-matches-yet, comparing against `Tournament.endDate` instead of `completed.length`.
- **2026-07-22** — `TeamFlag` gained an `imageUrl` prop; both country-vocab migrations applied to
  prod Turso, zero data loss.
- **2026-07-22** — Country-vocab implemented end-to-end: `Match.homeCountryCode`/`awayCountryCode`
  (FIFA) and `TopScorerCandidate.logoUrl` (vnexpress) replace the old `FIFA_CODES` lookup chain.
- **2026-07-22** — Country-vocabulary design decided (plan doc §2.1/2.2) — no ISO-3166 `Country`
  model; each adapter stores its own source's native identifier at ingestion instead.
- **2026-07-21** — Phase 2 started: `AwardSourceAdapter` + `VnexpressTopScorerAdapter` extracted,
  decoupling fixture sync from vnexpress.
- **2026-07-21** — Phase 1 schema (`Tournament` model + FKs) fork-tested and applied to prod Turso,
  zero data loss.
- **2026-07-21** — Phase 1 schema landed on dev Turso; `UserTournamentStats` and the prod migration
  deferred.
- **2026-07-21** — Progress tracker created from the plan doc.
