# Challenge Lifecycle

A **Challenge** is a side wager between two users on the outcome of a match ("loser buys N beers if X happens"). This doc walks through every status a challenge can be in, what triggers each transition, and where that logic lives.

`ChallengeStatus` enum: `prisma/schema.prisma`

## States

| Status | Meaning |
|---|---|
| `OPEN` | Created, waiting for the opponent to accept or reject. Default status on creation. |
| `ACCEPTED` | Opponent accepted. Locked in, waiting for the match to be played. |
| `REJECTED` | Opponent explicitly declined. Terminal. |
| `CANCELLED` | The **challenger** withdrew their own still-open challenge before the opponent responded. Terminal. |
| `ABANDONED` | Nobody responded before the match kicked off — it can never be accepted now. Terminal. |
| `REVIEW` | Match finished; both participants need to submit their pick of who actually won the challenge condition. |
| `CONFLICT` | Both submitted picks, but they disagree on the winner. Needs a fresh pick from either side to resolve. |
| `DONE` | Both sides agreed on the winner. Beers have been transferred. Terminal. |

`CANCELLED` and `ABANDONED` look similar in the UI (same muted badge) but mean different things: `CANCELLED` is a deliberate user action gated to the challenger; `ABANDONED` is a system-driven expiry that can happen to either side's inaction. Reusing one for the other would misrepresent whose action caused it.

## Transition diagram

```
                                  create()
                                     │
                                     ▼
                                  ┌──────┐
                        ┌─────────┤ OPEN ├─────────┬─────────────┐
                        │         └──────┘         │             │
                 respond(ACCEPT)  respond(REJECT) cancel()  FIFA sync resolves
                        │             │             │        match (still OPEN)
                        ▼             ▼             ▼             ▼
                  ┌──────────┐  ┌──────────┐  ┌───────────┐ ┌───────────┐
                  │ ACCEPTED │  │ REJECTED │  │ CANCELLED │ │ ABANDONED │
                  └────┬─────┘  └──────────┘  └───────────┘ └───────────┘
                       │             (terminal)   (terminal)   (terminal)
                 FIFA sync
                 resolves match
                       │
                       ▼
                  ┌──────────┐
             ┌────┤  REVIEW  │◄───────────────┐
             │    └────┬─────┘                │
    submitPick()  submitPick()          submitPick() (fresh pick
    (picks agree) (picks disagree)       resolves the disagreement)
             │           │                     │
             │           ▼                     │
             │     ┌──────────┐                │
             │     │ CONFLICT ├────────────────┘
             │     └────┬─────┘
             │    submitPick()
             │    (picks agree)
             ▼           │
        ┌──────┐         │
        │ DONE │◄────────┘
        └──────┘
        (terminal)
```

## Transitions in detail

| From | To | Trigger | Guard | Code |
|---|---|---|---|---|
| — | `OPEN` | `challenge.create` | Match hasn't started yet (`isChallengeableMatch`); stake ≤ both users' beer totals | `src/server/api/routers/challenge.ts` (`create`) |
| `OPEN` | `ACCEPTED` | `challenge.respond({ action: "ACCEPT" })` | Caller is the opponent; match hasn't started yet | `src/server/api/routers/challenge.ts:259-270` |
| `OPEN` | `REJECTED` | `challenge.respond({ action: "REJECT" })` | Caller is the opponent | `src/server/api/routers/challenge.ts:266-270` |
| `OPEN` | `CANCELLED` | `challenge.cancel` | Caller is the challenger | `src/server/api/routers/challenge.ts:280-301` |
| `OPEN` | `ABANDONED` | FIFA sync resolves the match (`syncFifaFixtures` → `resolveMatchVotes` → `resolveMatchChallenges`) | Challenge is still `OPEN` when the match completes — nobody accepted or rejected it in time | `src/server/services/resolve-challenges.ts:13-18` |
| `ACCEPTED` | `REVIEW` | FIFA sync resolves the match (`syncFifaFixtures` → `resolveMatchVotes` → `resolveMatchChallenges`) | — | `src/server/services/resolve-challenges.ts:7-11` |
| `REVIEW` | `DONE` | `challenge.submitPick` | Both participants picked the same winner | `src/server/api/routers/challenge.ts:353-357` |
| `REVIEW` | `CONFLICT` | `challenge.submitPick` | Both participants picked, but disagree | `src/server/api/routers/challenge.ts:346-351` |
| `CONFLICT` | `DONE` | `challenge.submitPick` (fresh pick) | The new pick agrees with the other side's existing pick | `src/server/api/routers/challenge.ts:353-357` |
| `CONFLICT` | `CONFLICT` | `challenge.submitPick` (fresh pick) | The new pick still disagrees | `src/server/api/routers/challenge.ts:346-351` |

`update` (editing stake/condition) doesn't change status — it's only allowed while a challenge is `OPEN` (`src/server/api/routers/challenge.ts:149-218`).

## Notes

- **Match resolution runs on the daily FIFA sync, not the instant a match ends.** The Vercel cron (`vercel.json`) hits `/api/cron/sync-fifa` once a day, which calls `syncFifaFixtures`. When that sync sees a match has newly transitioned to `COMPLETED`, it calls `resolveMatchVotes` → `resolveMatchChallenges` for it. The same path also runs on-demand via the admin panel's sync button or `npm run sync:fifa`. Either way, challenges on a match stay `OPEN`/`ACCEPTED` until one of these syncs picks up the completed result — not the moment the match itself finishes.
- **Idempotent on re-entry.** `resolveMatchChallenges` only touches rows still in `ACCEPTED` or `OPEN` for that `matchId`. Re-running vote resolution for an already-resolved match is a no-op for challenges.
- **`CONFLICT` isn't a dead end.** Either participant can submit a new pick at any time from `CONFLICT`; there's no separate "resolve conflict" action.
- **Settlement.** On the `REVIEW`/`CONFLICT` → `DONE` transition, beers move directly via `User.totalPoints` (`challenge.ts:359-397`); `challengerPoints`/`opponentPoints` on the `Challenge` row are an audit trail only, not the source of truth.
