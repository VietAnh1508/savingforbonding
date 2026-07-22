# Beer Amount Spin

Once the tournament is over and the community beer pool (`sum(User.totalPoints)`) is settled, each player spins a wheel once to pick their personal price-per-beer from a fixed set of amounts. This doc covers the gating rule, the schema, and where the logic lives.

## What it computes

```
Total amount = Community beer pool × average(amount) over players who have spun
```

Players who haven't spun are excluded from the average entirely — they are **not** treated as 0. See `computeBeerPoolAmount` in `src/lib/beer-amount-spin.ts`.

Wheel amounts are a fixed, shared constant: `BEER_AMOUNT_OPTIONS` in `src/lib/beer-amount-spin.ts` (currently `[500, 1000, 2000, 5000]`). The server picks the random result (`pickRandomBeerAmount`) and persists it inside the `spin` mutation — the client wheel only animates to whatever the server already committed to, so a user can't influence the outcome by inspecting or replaying client-side randomness.

## Schema

- `BeerAmountSpin` (`prisma/schema.prisma`): one row per `[userId, tournamentId]`, enforced by a `@@unique` constraint — this is what makes a second spin attempt fail at the DB layer, not just in the UI.
- `GameSettings.beerAmountSpinEnabled` (`Boolean @default(false)`): per-tournament flag controlling whether spinning is currently open. Defaults off so each new tournament starts with spinning disabled until an admin turns it on.

## The admin toggle is a one-way lock

The "Beer amount spin" control in the admin panel (`BeerAmountSpinToggleControl`, `src/app/admin/_components/stage-penalties-panel.tsx`) can be flipped on/off freely **only until the first player spins**. The moment any `BeerAmountSpin` row exists for the active tournament, the toggle becomes permanently disabled at whatever value it's currently at — there is no way to re-enable or close it afterward. This is enforced twice: the admin UI disables the control, and `admin.updateBeerAmountSpinEnabled` (`src/server/api/routers/admin.ts:458`) independently re-checks the same condition and throws if called directly, so the lock can't be bypassed by calling the API without the UI.

This is **intentional**, not a bug or an unfinished feature:

- Each player can only ever spin once (the DB unique constraint above), so once spinning is opened, the process self-completes — every player either spins or doesn't. There's nothing left for an admin to actively "close."
- Do not add a way to unlock/re-toggle this control, and do not add a separate "close spinning" admin action once players have started spinning.

`hasBeerAmountSpins` (computed via a `beerAmountSpin.count()` in `admin.getGameSettings`, `src/server/api/routers/admin.ts:390-404`) is what drives the disabled state; the mutation itself is `admin.updateBeerAmountSpinEnabled` (`src/server/api/routers/admin.ts:458`).

## Where the logic lives

| Concern | File |
|---|---|
| Pure helpers (options, RNG, pool math) | `src/lib/beer-amount-spin.ts` (+ `.test.ts`) |
| Player-facing router (`getStatus`, `getMySpin`, `spin`) | `src/server/api/routers/beer-amount-spin.ts` |
| Admin gating (`getGameSettings`, `updateBeerAmountSpinEnabled`) | `src/server/api/routers/admin.ts` |
| Admin toggle UI | `src/app/admin/_components/stage-penalties-panel.tsx` (`BeerAmountSpinToggleControl`) |
| Leaderboard join (per-user amount, pool average/total) | `src/server/api/routers/leaderboard.ts` (`global`, `totalBeerPool`) |
| Player-facing UI (button, modal, wheel) | `src/app/leaderboard/_components/spin-button-section.tsx`, `beer-amount-spin-modal.tsx`, `beer-wheel.tsx` |

`spin` is server-authoritative and rejects a repeat call with `TRPCError({ code: "CONFLICT" })` by catching the underlying Prisma `P2002` unique-violation on `create()` — no separate pre-check query, since the `@@unique` constraint is already the single source of truth (including for the race between two concurrent requests).
