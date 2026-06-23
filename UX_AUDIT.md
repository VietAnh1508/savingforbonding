# UX Audit — SavingForBonding

_Parallel audit across 10 flows._

## Executive Summary

The app's core loop is functional — users can sign in, find matches, and cast votes without breaking — but it fails to confirm its own actions, leaving users guessing at every critical moment. Three themes repeat across all ten flows: feedback signals are too weak or too brief (buttons that look disabled, toasts that vanish, stale tallies); outcome data the API already provides never reaches the screen (no per-match result, no personalised beer consequence); and key content is hidden behind unlabelled controls or football shorthand most casual players won't recognise. Fix the feedback loop first — it touches every flow and costs the least to address.

## Top Findings (ranked by impact)

### 🔴 High impact

**Sign in button** — The button uses a 20% opacity emerald fill, making it visually indistinguishable from a disabled state. It is the primary CTA on every user's first interaction. (Flows 1, 2) Suggestion: Replace `bg-emerald-500/20` with solid `bg-emerald-500 text-white`. Reserve translucent styles for secondary or disabled states only.

**Email field clears on failed login** — A failed sign-in redirects to a clean form, erasing the submitted email. The user must retype both fields after an already frustrating error. (Flow 1) Suggestion: Pass the email through a `?email=` search param on redirect and pre-fill the field server-side, so only the password needs re-entry.

**Zero post-login feedback before skeleton load** — After successful login there is no toast, spinner, or transition signal before the page silently begins a multi-second skeleton load. Users have no confirmation that login succeeded. (Flow 2) Suggestion: Fire a "Welcome back!" toast immediately on redirect and label the skeleton with a recognisable page title.

**Betting ratio with no label or unit** — Green monospace numbers (e.g. "1.5/0") appear under the VS/score on every match card with zero label, unit, or tooltip. First-time users cannot know if this is odds, handicap, or beer multiplier. (Flow 3) Suggestion: Add a "Beer ratio" label, or a tap/hover tooltip: "Beer penalty if you lose: home/away". At minimum, prefix with a beer icon.

**Voter count doesn't update after voting** — After casting a vote the match header still shows the pre-vote tally. The user has no social-proof confirmation their vote landed beyond an ephemeral toast. (Flow 4) Suggestion: Optimistically increment the chosen outcome's count in the same mutation that triggers the green button state and toast.

**Locked vote shows raw "1", "X", or "2" instead of team name** — When voting locks, the prediction is shown as football shorthand ("Your prediction: 1") rather than the team name. Most casual players won't recognise 1X2 notation. (Flows 5, 8) Suggestion: Replace `outcomeShort(currentVote)` with the full label — home country name, "Draw", or away country name — in all locked-state display paths.

**No per-match result shown on completed matches** — The detail page for completed matches never tells the user if their prediction was correct or wrong, even though `isCorrect` and `points` are already in the API response. (Flow 6) Suggestion: In the `votingOpen === false` branch, render a result badge: green "✓ Correct — 1 beer" or red "✗ Wrong — 3 beers". Show "Pending" when `isCorrect` is null.

**Completed match cards show no outcome badge in list view** — Users scanning 31 completed matches cannot see which they won or lost without opening each detail page. (Flow 6) Suggestion: On completed match cards where `userVoteOutcome` is set, render a small inline badge ("✓ 1🍺" green / "✗ 3🍺" red) using `isCorrect` and `points` from the listMatches query.

**Leaderboard row 8 renders "[object Object]" as a player name** — One user's name is a JSON object in the database rather than a plain string. The leaderboard router passes it unguarded to the UI. (Flow 7) Suggestion: Coerce in the router: `typeof user.name === 'string' ? user.name : null`. Add Zod validation at storage time.

**Current user's leaderboard row is not highlighted** — The logged-in user's row is visually identical to every other row. The page server component fetches no session data, making self-identification impossible. (Flow 7) Suggestion: Fetch the session in LeaderboardPage, pass the current user's ID to LeaderboardTable, and apply a distinct background (`bg-emerald-500/10` + left border accent) plus a "You" badge on the matching row.

**Tied players shown with sequential ranks instead of equal ranks** — Three players tied at 65 beers display as ranks 2, 3, 4 — contradicting the "Tie-breaker rules" link on the same page. (Flow 7) Suggestion: Assign equal rank numbers to tied-beer entries (all three show rank 2) and skip consumed numbers (next player shows 5).

**Stats card: three values require decoding a shared legend** — Correct/Wrong/Missed values are crammed into one card with a single tiny shared label. The dominant "31" (yellow/missed) is alarming with no inline explanation of its beer cost. (Flow 8) Suggestion: Split into three labeled cards, or add inline per-number labels ("31 missed") so the meaning is immediately legible without reading a legend.

**Rules page: no explanation of how to vote or when the window closes** — The Rules page lists beer penalties and tiebreakers but never explains how predictions work, where to cast them, or that they lock 5 minutes before kickoff. (Flow 9) Suggestion: Add a "How to play" section at the top: navigate to Matches, pick your predicted outcome, votes lock 5 minutes before kickoff.

**Profile link buried in unlabelled avatar button; no active state on /profile** — On mobile, Profile and Sign Out are inside an avatar pill that reads as an identity badge, not a navigation trigger. The hamburger drawer shows no active state on the Profile page. (Flow 10) Suggestion: Add a visible "Profile" label to the pill, or move Profile/Sign Out into the hamburger drawer. Add `aria-label="Account menu"` to the button. Highlight the avatar pill when on /profile.

### 🟡 Medium impact

**Error banner: 10% opacity red on mint background** — `bg-red-500/10` and `border-red-500/30` are nearly invisible; the error is easy to miss entirely. (Flow 1) Suggestion: Increase to `bg-red-500/15 border-red-500/50 text-red-600`. Add a warning icon at the start of the message.

**Error URL persists on refresh and bookmark** — `?error=InvalidCredentials` stays in the URL after a failed login, replaying the error banner misleadingly on refresh. (Flow 1) Suggestion: After rendering the error, use `history.replaceState` or a redirect-after-read pattern to strip the query param.

**Forgot password modal: no close button or Escape key handler** — Only dismissal paths are clicking the backdrop or a long dismiss button. No admin contact method is provided. (Flows 1, 2) Suggestion: Add Escape key listener, an X icon button, and a mailto link for the admin so users can act on the instruction.

**Submit button uses `hover:cursor-grab`** — A grab cursor on a form submit button is semantically incorrect and confusing. (Flow 2) Suggestion: Remove `hover:cursor-grab` from the SubmitButton component; the default pointer cursor is correct.

**No first-use nudge for users with zero predictions** — A freshly logged-in user with no votes sees the match list with no prompt to cast their first prediction. (Flows 2, 3) Suggestion: Show a highlighted banner or empty-state card for users with zero votes, pointing them to cast their first prediction.

**No "Predict" affordance on unpredicted match cards** — Cards without a prediction show only "VS" — identical in appearance to voted cards. The card is a link but looks like a read-only info panel. (Flow 3) Suggestion: Add a subtle "Predict →" label or chevron on votable, unpredicted cards.

**"Batch predict" / "Update batch" jargon labels** — "Update batch" is not plain language; users may not know a "batch" is all their day's predictions. (Flow 3) Suggestion: Rename to "Predict all" and "Edit predictions".

**Date filter pill bar: no scroll overflow indicator** — The horizontal pill bar is scrollable but shows no fade or shadow at the edge to indicate more dates off-screen. (Flow 3) Suggestion: Add a CSS fade-out gradient mask on the right (and left when not at start) edge of the bar.

**Draw button's primary label is "X" — reads as cancel** — A large bold "X" with "Draw" as a small gray subtitle creates a moment of confusion on first view. (Flow 4) Suggestion: Use "Draw" as the primary label and optionally "(X)" in parentheses as a secondary note.

**Vote buttons don't show team flags** — The vote buttons show only plain team name text while the match header directly above uses large flag icons as the primary team identifier. (Flow 4) Suggestion: Add the team flag emoji or image above each team name on the vote button, mirroring the header.

**Beer odds handicap text uses (1)/(X)/(2) notation** — Sports-betting shorthand is opaque to casual players, and "(X)" conflicts with the large X on the Draw button. (Flow 4) Suggestion: Rewrite in plain language: "France must win by 3+ goals for a France bet to win." Remove or define (1)/(X)/(2) notation.

**"Place your vote" heading doesn't update after a vote is cast** — Always reads "Place your vote" even when a vote is highlighted in green, creating conflicting signals for returning users. (Flow 5) Suggestion: Conditionally render "Your prediction" or "Change your prediction" when `currentVote` is set. One-line conditional change.

**No personalised beer-penalty notice when user missed voting on a locked match** — When voting is locked and the user has no vote, only the generic "Voting is locked" banner appears. The 2-beer penalty — the core game motivator — is never connected to the user's specific situation. (Flows 5, 6) Suggestion: Add "You didn't place a bet — that's 2 beers" styled in amber, in the locked + no-vote branch of VoteForm.

**Locked state banner uses error-red styling for a routine completed match** — `border-red-500/30 bg-red-500/10` is the same visual language as an error state, applied to a normal expected outcome. (Flow 6) Suggestion: Style completed-match locked banners with a neutral palette. Reserve red for actionable errors; use amber if the user missed the vote.

**Beer count tooltip: unlabelled numbers, inaccessible on mobile** — Tooltip shows "6 / 9 / 16" with no text labels; hover-only, so not accessible on touch devices. (Flow 7) Suggestion: Add inline labels "6 correct / 9 wrong / 16 missed". Add an ⓘ icon next to the beer count to signal interactivity.

**"Joining Date" column is unexplained clutter on the leaderboard** — No indication this is a tie-breaker. Reads as unrelated data on a competitive standings table. (Flow 7) Suggestion: Rename to "Joined (tie-breaker)" with a tooltip, or remove the column and let the rules link explain the logic.

**"Total Beer Pool" tab contains only a single number** — An entire tab for one stat with a large empty area below feels like a stub. (Flow 7) Suggestion: Enrich with per-player contribution bars or a running total, or remove the tab and inline the community beer pool stat as a summary header on the All Time leaderboard.

**"Recent Predictions" heading misrepresents the content** — The section mixes actual predictions with missed-match penalties under one heading; for users who haven't voted, the heading is factually wrong. (Flow 8) Suggestion: Rename to "Match History" or "Voting History".

**Beer totals show 0 while 31 missed-match rows accumulate silently** — Pending beers are excluded until admin resolves votes, but the UI offers no explanation of this. The numbers directly contradict each other. (Flow 8) Suggestion: Add a note: "Beer totals update after each match is resolved." Or show pending beers as a separate figure.

**Tiebreaker wording "More wrong predictions comes first" is ambiguous** — "Comes first" reads as a positive outcome; the direction (more wrong = worse rank) is unclear. (Flow 9) Suggestion: "Tied players are separated by most wrong predictions (more = worse rank), then most missed, then alphabetical order."

### 🟢 Low impact / Nice to have

**Sign-in subtitle is purely procedural** — "Sign in with your email and password" gives no app context to a first-time user. (Flow 1) Suggestion: Replace with "The World Cup prediction game — pick your winners, settle your beers."

**"Forgot password?" button placement interrupts the form tap flow** — Sits between the password field and Sign in button, directly in the vertical tap path on mobile. (Flows 1, 2) Suggestion: Move below the Sign in button, above the "No account yet?" line.

**"UP COMING" two-word badge** — Looks like a typo; inconsistent with LIVE and COMPLETED badges. (Flows 3, 4) Suggestion: Change to "UPCOMING" (one word) everywhere the badge appears.

**No voting deadline shown before the user has voted** — "You can change your vote until 5 minutes before kickoff" only appears after a vote is cast; there is no urgency signal before voting. (Flow 4) Suggestion: Show the deadline or countdown under "Place your vote" before the user votes, not only after.

**Toast disappears in ~2 seconds — users may miss vote confirmation** — The primary post-vote signal vanishes too quickly; only a subtle green button remains if the user glances away. (Flows 4, 5) Suggestion: Increase toast duration to at least 4 seconds, or add a persistent inline "Your pick: [team]" label beneath the buttons.

**LIVE match card in Upcoming tab gives no "voting closed" signal** — LIVE cards appear with the same interactive appearance as votable matches; tapping is the only way to discover voting is closed. (Flow 3) Suggestion: Replace the vote-counts section on LIVE cards with a "Voting closed" note, or grey the card slightly.

**Leaderboard "Last updated" timestamp is 12+ hours old with no refresh option** — Users checking mid-day see stale data with no way to refresh and no indication of when the next update arrives. (Flow 7) Suggestion: Add a manual "Refresh" button, or show relative time ("updated 3 hours ago").

**"Total Beer Pool" tab is a stub** — One number with a large empty area; disproportionate for an entire tab. (Flow 7) Suggestion: Enrich with per-player breakdown, or inline the stat as a summary header on the All Time leaderboard and remove the tab.

**Profile avatar shows only one initial** — With ~40 friends, single-initial avatars give poor visual identity; many may share a first letter. (Flow 8) Suggestion: Use two initials (first + last name initial).

**0% accuracy shown when user has no resolved votes** — Implies poor performance rather than simply no data yet. (Flow 8) Suggestion: Show "—" or "N/A" with caption "Calculated once matches are resolved."

**Rules page subtitle overpromises** — "How the beer betting system works" but the page only covers penalty amounts and tiebreakers. (Flow 9) Suggestion: Expand content to match the promise, or narrow to "Beer penalty amounts and tiebreaker rules."

**ThemeToggle crammed into the mobile header** — Three controls in ~120px; moon and hamburger icons are easy to mis-tap on a 375px phone. (Flow 10) Suggestion: Move ThemeToggle into the hamburger dropdown or user menu.

**Hamburger dropdown has no backdrop scrim** — The menu floats over live page content with no overlay, making nav links harder to read and the modal affordance unclear. (Flow 10) Suggestion: Add a `bg-black/30` full-screen overlay behind the dropdown, dismissible on tap.

---

## Flow-by-flow notes

### Flow 1 — Sign-in page & error state

Clean, uncluttered form but fails at both its critical moments: the primary CTA looks disabled, and a failed login wipes the user's email requiring them to retype it. The error banner is nearly invisible at 10% opacity.

- 🔴 **Sign in button** — 20% opacity fill indistinguishable from disabled → solid `bg-emerald-500 text-white`
- 🔴 **Email field on failed login** — full form reset, user must retype email → pass via `?email=` param and pre-fill server-side
- 🟡 **Error banner** — `bg-red-500/10` nearly invisible → increase to `bg-red-500/15 border-red-500/50 text-red-600`, add warning icon
- 🟡 **Error in URL** — persists on refresh, replays error → strip with `history.replaceState` after render
- 🟡 **Forgot password modal** — no Escape handler, no X button, no admin contact method → add Escape listener, X icon, mailto link
- 🟢 **Sign-in subtitle** — purely procedural → "The World Cup prediction game — pick your winners, settle your beers."
- 🟢 **"Forgot password?" placement** — in the vertical tap path between password and submit → move below the Sign in button

### Flow 2 — Login (successful auth)

Login technically succeeds but provides zero confidence at the two most critical moments: submitting credentials and arriving post-login.

- 🔴 **Post-login transition** — zero feedback before silent 3-second skeleton load → "Welcome back!" toast on redirect; label the skeleton
- 🟡 **Submit button cursor** — `hover:cursor-grab` on a form button → remove from SubmitButton component
- 🟡 **Forgot password modal** — no admin contact method → add mailto link so users can act on the instruction
- 🟡 **First-use nudge** — no prompt for users with zero votes → highlighted banner or empty-state card pointing to first prediction

### Flow 3 — Home / upcoming matches list

Functionally solid with date grouping, sticky filter, and batch shortcut. Main gaps: unlabelled betting ratios, no action affordance on unpredicted cards, and confusing batch-predict labels.

- 🔴 **Betting ratio ("1.5/0")** — no label, unit, or tooltip → "Beer ratio" label or "Beer penalty if you lose: home/away" tooltip
- 🔴 **"UP COMING" badge** — two words, looks like a typo → "UPCOMING" everywhere
- 🟡 **Unpredicted match cards** — no "Predict" affordance, looks read-only → "Predict →" label or chevron on votable unpredicted cards
- 🟡 **"Batch predict" / "Update batch"** — jargon → "Predict all" / "Edit predictions"
- 🟡 **Date pill bar overflow** — no edge fade indicating more dates off-screen → CSS gradient mask on right (and left) edge
- 🟢 **LIVE cards in Upcoming tab** — look interactive despite voting being locked → replace vote-counts with "Voting closed" note

### Flow 4 — Vote on a match

One click votes, button turns green, toast fires — the core path works. But the voter count is stale after voting, the Draw "X" label confuses, and flags disappear from the vote buttons directly below the flags in the header.

- 🔴 **Voter count (stale after voting)** — header tally doesn't increment → optimistic increment in the mutation
- 🟡 **Draw button ("X" primary label)** — large X reads as cancel → "Draw" primary, "(X)" secondary
- 🟡 **Vote buttons (no flags)** — visual discontinuity with the match header above → add flag emoji/image above team name on each button
- 🟡 **Handicap explanation** — (1)/(X)/(2) shorthand opaque to casual players → plain language: "France must win by 3+ goals for a France bet to win"
- 🟢 **No deadline shown before voting** — urgency text only appears post-vote → show deadline/countdown before the user votes too
- 🟢 **Toast disappears in ~2 seconds** — primary confirmation signal too brief → 4-second duration + persistent inline "Your pick: [team]" label

### Flow 5 — Already-voted match

Green circle on list cards clearly signals voted status. Detail page has two clarity gaps: the heading never updates post-vote, and the locked state shows "1"/"X"/"2" instead of a team name.

- 🔴 **Locked vote: "Your prediction: 1"** — raw shorthand with no key visible → replace `outcomeShort` with full label: home country / "Draw" / away country
- 🟡 **"Place your vote" heading after voting** — contradicts the highlighted green selection → "Your prediction" / "Change your prediction" when `currentVote` is set
- 🟡 **No beer-penalty reminder (missed vote, locked)** — users who missed the window get no "that's 2 beers" notice → "You didn't place a bet — that's 2 beers" in amber styling
- 🟢 **Post-vote confirmation (toast)** — too brief; green button alone is implicit → persistent inline "Saved ✓" beneath vote buttons for the session

### Flow 6 — Completed match & result display

Score is shown clearly; beer penalty system is explained generically. Critical gap: `isCorrect` and `points` are already in the API response but neither reaches the screen — users cannot see their own result without navigating to their profile.

- 🔴 **VoteForm locked state — no result shown** — `isCorrect` and `points` in API, not rendered → result badge: "✓ Correct — 1 beer" / "✗ Wrong — 3 beers" / "Pending"
- 🔴 **Completed match cards — no outcome badge** — 31 cards to open individually → inline badge ("✓ 1🍺" / "✗ 3🍺") using `isCorrect` and `points`
- 🟡 **Missed vote on completed match** — generic "Voting is locked", no personalised penalty notice → "You didn't predict this match — you owe 2 beers."
- 🟡 **Locked banner uses error-red for routine completed match** — false alarm feeling on every past match → neutral palette for completed; amber only if user missed the vote

### Flow 7 — Leaderboard

Renders fast with medal icons and badges. Three critical issues undermine trust: a player name is "[object Object]", the current user's row is not highlighted, and tied players show sequential ranks.

- 🔴 **Row 8: "[object Object]" player name** — JSON object stored as name, passed unguarded to UI → coerce in router: `typeof user.name === 'string' ? user.name : null`; add Zod validation
- 🔴 **Current user row not highlighted** — no session fetched in page server component → fetch session, pass user ID to table, apply `bg-emerald-500/10` + "You" badge
- 🔴 **Tied ranks shown as 2, 3, 4 instead of 2, 2, 2** — false impression of definitive ranking → equal rank numbers for tied-beer entries; skip consumed numbers
- 🟡 **Tooltip: unlabelled numbers** — "6 / 9 / 16" users must guess; hover-only on desktop → "6 correct / 9 wrong / 16 missed"; add ⓘ icon
- 🟡 **"Joining Date" column** — no indication it is a tiebreaker → rename "Joined (tie-breaker)" with tooltip, or remove
- 🟡 **"Total Beer Pool" tab** — entire tab for a single number → enrich with per-player bars, or inline stat as summary header and remove tab
- 🟢 **Stale "last updated" timestamp** — 12+ hours old, no refresh → manual refresh button or relative "updated X hours ago"

### Flow 8 — Profile / my stats

Useful stats and prediction history exist but are hard to read: the Correct/Wrong/Missed card requires decoding a color legend, beer totals show 0 while 31 missed-match rows accumulate, and the section heading is factually wrong for users who haven't voted.

- 🔴 **Stats card (0 / 0 / 31)** — shared label requires decoding; "31" alarming with no beer cost explanation → three labeled cards or inline per-number labels
- 🔴 **"Recent Predictions" heading** — factually wrong when all rows say "No prediction" → "Match History" or "Voting History"
- 🔴 **Beer totals show 0 despite 31 missed matches** — pending beers silently excluded with no explanation → add note about resolution, or show pending beers separately
- 🟡 **Prediction shortcodes ("Predicted: 2")** — 1X2 notation opaque to casual players → "Predicted: Away Win" or "2 (Away Win)"
- 🟡 **No visual distinction: missed vs voted rows** — same layout, low-contrast "No prediction" text → left-border accent or icon (warning for missed, checkmark for voted)
- 🟡 **20-item hard limit with no indicator** — silently truncated history → "Showing 20 of 31 matches" label or "View all" link
- 🟢 **Avatar: single initial** — poor identity differentiation among ~40 friends → two initials (first + last)
- 🟢 **0% accuracy with no resolved votes** — implies poor performance rather than no data → "—" or "N/A" with caption "Calculated once matches are resolved."

### Flow 9 — Rules page

Extremely sparse — two small cards covering penalty amounts and tiebreakers. Missing everything a first-time user needs to understand the game.

- 🔴 **No explanation of how to vote** — nothing on choices, where to vote, or the 5-minute lock window → "How to play" section before beer stakes card
- 🔴 **"Match handicap" phrase unexplained** — card mentions handicap but never explains it → one-sentence inline explanation, or remove clause if feature is not yet implemented
- 🟡 **Tiebreaker: "More wrong predictions comes first"** — ambiguous direction → "Tied players are separated by most wrong predictions (more = worse rank), then most missed, then alphabetical."
- 🟡 **Rules link hidden in hamburger on mobile** — reference content buried one tap deep for the most likely audience segment → surface "How to play" prompt on Matches page for first-time users
- 🟢 **Page subtitle overpromises** — "How the beer betting system works" but only covers penalties and tiebreakers → expand content or narrow: "Beer penalty amounts and tiebreaker rules."

### Flow 10 — Navigation & global chrome

Consistent sticky header and working user dropdown. Main problems: Profile and Sign Out are behind an unlabelled avatar button that looks like a static badge, and the hamburger shows no active state on the Profile page.

- 🔴 **Avatar button (mobile)** — no aria-label; reads as identity badge not nav trigger; Profile and Sign Out undiscoverable → "Profile" label on pill or move into hamburger drawer; `aria-label="Account menu"`
- 🔴 **No active state on /profile in hamburger** — user has no location indicator → add Profile as fourth nav item with active-state underline, or highlight avatar pill when on /profile
- 🟡 **User dropdown top item looks static** — name + email row not obviously a navigation link → add "View profile →" label or rename "My Profile"
- 🟡 **Hamburger: no backdrop scrim** — page content bleeds through; modal affordance unclear → `bg-black/30` full-screen overlay, dismissible on tap
- 🟡 **Avatar button: no aria-label** — screen readers announce unlabelled button → `aria-label="Account menu"` in user-menu.tsx
- 🟢 **ThemeToggle in mobile header** — three controls in ~120px; easy to mis-tap → move ThemeToggle into hamburger dropdown or user menu

---

## Quick wins

Checklist of changes that are low effort but high visibility.

- [x] Change `bg-emerald-500/20` to `bg-emerald-500 text-white` on the Sign in button (SubmitButton component)
- [x] Fix "UP COMING" → "UPCOMING" in the status badge component used across match cards and detail page
- [x] Remove `hover:cursor-grab` from SubmitButton; default pointer cursor is correct
- [x] Replace `outcomeShort(currentVote)` with team name / "Draw" in the locked-vote display path
- [x] Rename "Batch predict" → "Predict all" and "Update batch" → "Edit predictions"
- [x] Increase error banner opacity: `bg-red-500/15 border-red-500/50 text-red-600`
- [x] Add `aria-label="Account menu"` to the user avatar button in user-menu.tsx
- [ ] Coerce user.name in leaderboard router: `typeof user.name === 'string' ? user.name : null`
- [ ] Add Escape key listener and an X close button to the Forgot Password modal
- [x] Rename profile page section "Recent Predictions" → "Match History"
- [ ] Show "—" instead of "0%" accuracy when the user has zero resolved votes
- [ ] Strip the `?error=` query param from the URL after the error banner renders (client-side `history.replaceState`)
- [x] Update the leaderboard rank algorithm to assign equal ranks to tied-beer entries and skip consumed rank numbers
- [x] Add a CSS fade gradient mask to the right edge of the date pill bar
- [ ] Use two initials (first + last) in the profile avatar rather than just the first letter
- [x] Pass the submitted email back via `?email=` search param on failed login and pre-fill the email input on the redirect

## Feature suggestions

New capabilities worth considering based on observed friction.

- [x] **Outcome feed** — Per-match result badge on completed match cards, rendering `isCorrect` and `points` already present in the listMatches response. No new query required.
- [ ] **Pending beers counter** — Show accrued but unresolved beer debts on the profile page so the 0/31 contradiction is explained and game stakes stay visible between admin resolution runs.
- [x] **Leaderboard self-highlight** — Current-user row highlighting requires one additional session fetch in the page server component; high perceived value for a social standings view.
- [ ] **First-prediction nudge** — A one-time highlighted banner shown when a logged-in user has zero votes, directing them to the Matches page. Dismisses permanently once a vote is cast.
- [ ] **Expand the Rules page** — Add a "How to play" section (three sentences: where to vote, what choices are available, the 5-minute lock window) and a plain-language handicap explanation.
- [ ] **Beer ratio tooltip** — Tap/hover tooltip on the ratio value on each match card explaining "Beer penalty if you lose: home/away", using the existing ratio data already rendered in the UI.
- [ ] **Post-vote social signal** — After voting, show "X of Y friends also picked [team]" under the vote buttons to reinforce the group-game feeling and provide social context for the decision.
- [ ] **Daily results summary** — A collapsed day-row on the Completed tab showing "3 correct, 1 wrong" per day, letting users scan their performance without opening 31 individual detail cards.

