import { describe, expect, it } from "vitest";

import { BEER_LOSE, BEER_NO_VOTE, BEER_WIN } from "~/lib/match";
import {
  computeRankHistory,
  findBiggestSingleDayMoves,
  type DaySnapshot,
} from "~/lib/rank-history";

// Noon UTC on a given date = 7pm VN = same calendar day in VN
const d = (dateStr: string) => new Date(`${dateStr}T12:00:00Z`);

const alice = { id: "alice", name: "Alice", image: null };
const bob = { id: "bob", name: "Bob", image: null };
const carol = { id: "carol", name: "Carol", image: null };

describe("computeRankHistory", () => {
  it("returns empty days when there are no matches", () => {
    const result = computeRankHistory([], [], [alice, bob]);
    expect(result.days).toHaveLength(0);
    expect(result.series).toHaveLength(2);
  });

  it("returns a day with empty ranks when there are no users", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const result = computeRankHistory([match], [], []);
    expect(result.days).toHaveLength(1);
    expect(result.days[0]!.ranks).toEqual({});
    expect(result.days[0]!.beers).toEqual({});
  });

  it("assigns rank 1 to a single user who voted correctly", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const vote = { userId: "alice", matchId: "m1", points: BEER_WIN, isCorrect: true };

    const result = computeRankHistory([match], [vote], [alice]);

    expect(result.days).toHaveLength(1);
    expect(result.days[0]!.ranks["alice"]).toBe(1);
    expect(result.days[0]!.beers["alice"]).toBe(BEER_WIN);
  });

  it("charges BEER_NO_VOTE when a user did not vote on a group-stage match", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    // alice did not vote

    const result = computeRankHistory([match], [], [alice]);

    expect(result.days[0]!.beers["alice"]).toBe(BEER_NO_VOTE);
  });

  it("charges a higher no-vote penalty for knockout-stage matches", () => {
    const knockoutNoVotePenalty = BEER_NO_VOTE + 6;
    const match = {
      id: "m1",
      kickoffAt: d("2026-06-12"),
      noVotePenalty: knockoutNoVotePenalty,
    };

    const result = computeRankHistory([match], [], [alice]);

    expect(result.days[0]!.beers["alice"]).toBe(knockoutNoVotePenalty);
  });

  it("ranks user with more beers first", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "m1", points: BEER_LOSE, isCorrect: false },
      { userId: "bob",   matchId: "m1", points: BEER_WIN,  isCorrect: true  },
    ];

    const result = computeRankHistory([match], votes, [alice, bob]);

    const day = result.days[0]!;
    expect(day.ranks["alice"]).toBe(1); // 3 beers
    expect(day.ranks["bob"]).toBe(2);   // 1 beer
  });

  it("assigns the same rank to users with identical stats (tie)", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "m1", points: BEER_LOSE, isCorrect: false },
      { userId: "bob",   matchId: "m1", points: BEER_LOSE, isCorrect: false },
    ];

    const result = computeRankHistory([match], votes, [alice, bob]);

    expect(result.days[0]!.ranks["alice"]).toBe(1);
    expect(result.days[0]!.ranks["bob"]).toBe(1);
  });

  it("breaks a beer tie using accuracy ascending (lower accuracy = higher rank)", () => {
    // Two matches. Alice voted on both — wrong once, right once (50% accuracy).
    // Bob voted on both — wrong twice (0% accuracy).
    // Same beers: alice 3+1=4, bob 3+3=6 — not equal, bad example.
    //
    // To get equal beers with different accuracy:
    // alice: wrong m1 (3) + correct m2 (1) = 4 beers, 1/2 = 50% accuracy
    // bob:   no-vote m1 (2) + no-vote m2 (2) = 4 beers, 0/0 = 0% accuracy (no votes)
    // Same beers, different accuracy → accuracy tiebreaker fires.
    // Lower accuracy (bob, 0%) should rank higher (#1) than alice (50%).
    const m1 = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const m2 = { id: "m2", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "m1", points: BEER_LOSE, isCorrect: false },
      { userId: "alice", matchId: "m2", points: BEER_WIN,  isCorrect: true  },
    ];

    const result = computeRankHistory([m1, m2], votes, [alice, bob]);

    const day = result.days[0]!;
    // Both at 4 beers
    expect(day.beers["alice"]).toBe(BEER_LOSE + BEER_WIN); // 4
    expect(day.beers["bob"]).toBe(BEER_NO_VOTE + BEER_NO_VOTE); // 4
    // bob has 0% accuracy (no votes at all); alice has 50% — lower accuracy ranks #1
    expect(day.ranks["bob"]).toBe(1);
    expect(day.ranks["alice"]).toBe(2);
  });

  it("breaks a beer+accuracy tie using incorrect predictions descending", () => {
    // Two matches. Alice wrong on both (6 beers, 0% accuracy, 2 incorrect).
    // Bob wrong on one, no-vote on one (3+2=5 beers) → not equal beers.
    // Let's construct a true incorrect-count tie:
    // m1, m2, m3: alice wrong m1 (3), correct m2 (1), no-vote m3 (2) → 6 beers, 1/2=50% acc, 1 incorrect
    // carol wrong m1 (3), no-vote m2 (2), correct m3 (1) → 6 beers, 1/2=50% acc, 1 incorrect
    // Same everything → same rank
    const m1 = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const m2 = { id: "m2", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const m3 = { id: "m3", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "m1", points: BEER_LOSE, isCorrect: false },
      { userId: "alice", matchId: "m2", points: BEER_WIN,  isCorrect: true  },
      { userId: "carol", matchId: "m1", points: BEER_LOSE, isCorrect: false },
      { userId: "carol", matchId: "m3", points: BEER_WIN,  isCorrect: true  },
    ];

    const result = computeRankHistory([m1, m2, m3], votes, [alice, carol]);

    const day = result.days[0]!;
    expect(day.beers["alice"]).toBe(BEER_LOSE + BEER_WIN + BEER_NO_VOTE); // 6
    expect(day.beers["carol"]).toBe(BEER_LOSE + BEER_NO_VOTE + BEER_WIN); // 6
    expect(day.ranks["alice"]).toBe(day.ranks["carol"]); // full tie
  });

  it("accumulates beers correctly across multiple days", () => {
    const m1 = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const m2 = { id: "m2", kickoffAt: d("2026-06-13"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "m1", points: BEER_WIN,  isCorrect: true  },
      { userId: "alice", matchId: "m2", points: BEER_LOSE, isCorrect: false },
    ];

    const result = computeRankHistory([m1, m2], votes, [alice]);

    expect(result.days).toHaveLength(2);
    expect(result.days[0]!.beers["alice"]).toBe(BEER_WIN);
    expect(result.days[1]!.beers["alice"]).toBe(BEER_WIN + BEER_LOSE);
  });

  it("groups multiple matches on the same day into a single snapshot", () => {
    const m1 = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const m2 = { id: "m2", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "m1", points: BEER_WIN,  isCorrect: true  },
      { userId: "alice", matchId: "m2", points: BEER_LOSE, isCorrect: false },
    ];

    const result = computeRankHistory([m1, m2], votes, [alice]);

    expect(result.days).toHaveLength(1);
    expect(result.days[0]!.date).toBe("2026-06-12");
    expect(result.days[0]!.beers["alice"]).toBe(BEER_WIN + BEER_LOSE);
  });

  it("applies no-vote penalty only to users who did not vote on that match", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "m1", points: BEER_WIN, isCorrect: true },
      // bob did not vote
    ];

    const result = computeRankHistory([match], votes, [alice, bob]);

    const day = result.days[0]!;
    expect(day.beers["alice"]).toBe(BEER_WIN);   // voted correctly
    expect(day.beers["bob"]).toBe(BEER_NO_VOTE);  // no vote
  });

  it("includes all users in series regardless of whether they voted", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };

    const result = computeRankHistory([match], [], [alice, bob, carol]);

    expect(result.series).toHaveLength(3);
    expect(result.series.map((s) => s.userId)).toEqual(
      expect.arrayContaining(["alice", "bob", "carol"]),
    );
  });

  it("does not charge a no-vote penalty to users who voted but whose vote is not yet resolved", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    // alice voted (isCorrect: null = unresolved); bob did not vote
    const votes = [
      { userId: "alice", matchId: "m1", points: 0, isCorrect: null as boolean | null },
    ];

    const result = computeRankHistory([match], votes, [alice, bob]);

    const day = result.days[0]!;
    expect(day.beers["alice"]).toBe(0);         // voted, unresolved → no penalty, no points
    expect(day.beers["bob"]).toBe(BEER_NO_VOTE); // did not vote → penalty
  });

  it("clamps beer total at 0 when a correct star vote produces negative points", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    // A correct star vote on a group-stage match returns -BEER_NO_VOTE*2 = -4 points
    const votes = [
      { userId: "alice", matchId: "m1", points: -4, isCorrect: true },
    ];

    const result = computeRankHistory([match], votes, [alice]);

    // Math.max(0, 0 + (-4)) = 0; should not go negative
    expect(result.days[0]!.beers["alice"]).toBe(0);
  });

  it("assigns correct VN date for a match at 17:00 UTC (midnight VN = next VN day boundary)", () => {
    // 17:00 UTC = 00:00 VN next day → matches at 17:30 UTC are already the next VN day
    const m1 = { id: "m1", kickoffAt: new Date("2026-06-12T16:59:00Z"), noVotePenalty: BEER_NO_VOTE }; // 23:59 VN → Jun 12
    const m2 = { id: "m2", kickoffAt: new Date("2026-06-12T17:00:00Z"), noVotePenalty: BEER_NO_VOTE }; // 00:00 VN → Jun 13

    const result = computeRankHistory([m1, m2], [], [alice]);

    expect(result.days[0]!.date).toBe("2026-06-12");
    expect(result.days[1]!.date).toBe("2026-06-13");
  });

  it("returns bonusDay: null when no bonus is passed", () => {
    const match = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const result = computeRankHistory([match], [], [alice]);
    expect(result.bonusDay).toBeNull();
  });

  it("folds champion and top-scorer swings into beers on the Final's day", () => {
    const final = { id: "final", kickoffAt: d("2026-06-13"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "final", points: BEER_WIN, isCorrect: true },
    ];
    const bonus = {
      date: "2026-06-13",
      championVotes: [{ userId: "alice", points: -50 }],
      topScorerVotes: [{ userId: "alice", points: 50 }],
    };

    const result = computeRankHistory([final], votes, [alice], bonus);

    // max(0, BEER_WIN - 50) = 0, then max(0, 0 + 50) = 50 (two clamped steps)
    expect(result.days[0]!.beers["alice"]).toBe(50);
    expect(result.bonusDay).toEqual({
      date: "2026-06-13",
      championPoints: { alice: -50 },
      topScorerPoints: { alice: 50 },
    });
  });

  it("clamps champion and top-scorer swings as two separate steps, not combined", () => {
    // Mirrors resolveChampionVotes/resolveTopScorerVotes: each applyPointsDelta
    // call clamps totalPoints at 0 independently, champion first.
    const final = { id: "final", kickoffAt: d("2026-06-13"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "final", points: 150, isCorrect: false },
    ];
    const bonus = {
      date: "2026-06-13",
      championVotes: [{ userId: "alice", points: -200 }], // correct ×4 champion pick
      topScorerVotes: [{ userId: "alice", points: 50 }], // wrong top-scorer pick
    };

    const result = computeRankHistory([final], votes, [alice], bonus);

    // max(0, max(0, 150 - 200) + 50) = 50, NOT max(0, 150 - 200 + 50) = 0
    expect(result.days[0]!.beers["alice"]).toBe(50);
  });

  it("does not apply a bonus for users absent from the champion/top-scorer entries", () => {
    const final = { id: "final", kickoffAt: d("2026-06-13"), noVotePenalty: BEER_NO_VOTE };
    const bonus = {
      date: "2026-06-13",
      championVotes: [{ userId: "alice", points: -50 }],
      topScorerVotes: [],
    };

    const result = computeRankHistory([final], [], [alice, bob], bonus);

    expect(result.days[0]!.beers["bob"]).toBe(BEER_NO_VOTE);
  });

  it("resolves a correct all-in vote against the reconstructed running total, ignoring the stored delta, then still applies a same-day bonus on top", () => {
    // Regression test for a real production case: an all-in vote's stored
    // `points` is production's live totalPoints delta at resolution time
    // (order-dependent on whether the same-day bonus happened to apply
    // first), which this replay can't reproduce — so all-in must resolve
    // against the replay's own running total (clear to 0 here) instead of
    // adding that stored delta. The bonus clamp then still runs afterward,
    // against the combined total, exactly as for any other user.
    const final = { id: "final", kickoffAt: d("2026-06-13"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      {
        userId: "alice",
        matchId: "final",
        points: -9999, // arbitrary/stale delta — must be ignored for all-in
        isCorrect: true,
        isAllIn: true,
      },
    ];
    const bonus = {
      date: "2026-06-13",
      championVotes: [{ userId: "alice", points: 100 }], // wrong champion pick
      topScorerVotes: [{ userId: "alice", points: -50 }], // correct top-scorer pick
    };

    const result = computeRankHistory([final], votes, [alice], bonus);

    // correct all-in -> 0. Then max(0, max(0, 0+100)-50) = 50 (two clamped steps).
    expect(result.days[0]!.beers["alice"]).toBe(50);
  });

  it("doubles the reconstructed running total for an incorrect all-in vote, ignoring the stored delta", () => {
    const m1 = { id: "m1", kickoffAt: d("2026-06-12"), noVotePenalty: BEER_NO_VOTE };
    const final = { id: "final", kickoffAt: d("2026-06-13"), noVotePenalty: BEER_NO_VOTE };
    const votes = [
      { userId: "alice", matchId: "m1", points: BEER_LOSE, isCorrect: false },
      {
        userId: "alice",
        matchId: "final",
        points: 12345, // arbitrary/stale delta — must be ignored for all-in
        isCorrect: false,
        isAllIn: true,
      },
    ];

    const result = computeRankHistory([m1, final], votes, [alice]);

    // BEER_LOSE (3) doubled by the wrong all-in -> 6, ignoring the stored delta.
    expect(result.days[1]!.beers["alice"]).toBe(BEER_LOSE * 2);
  });
});

describe("findBiggestSingleDayMoves", () => {
  const day = (date: string, ranks: Record<string, number>): DaySnapshot => ({
    date,
    ranks,
    beers: {},
  });

  it("returns null for both when there are fewer than 2 days", () => {
    expect(findBiggestSingleDayMoves([])).toEqual({
      biggestClimb: null,
      biggestDrop: null,
    });
    expect(
      findBiggestSingleDayMoves([day("2026-06-12", { alice: 1 })]),
    ).toEqual({ biggestClimb: null, biggestDrop: null });
  });

  it("identifies a user climbing from rank 3 to rank 1 as the biggest climb", () => {
    const days = [
      day("2026-06-12", { alice: 3, bob: 1, carol: 2 }),
      day("2026-06-13", { alice: 1, bob: 2, carol: 3 }),
    ];

    const { biggestClimb } = findBiggestSingleDayMoves(days);

    expect(biggestClimb).toEqual({
      userId: "alice",
      fromDate: "2026-06-12",
      toDate: "2026-06-13",
      fromRank: 3,
      toRank: 1,
      delta: 2,
    });
  });

  it("identifies a user dropping from rank 1 to rank 4 as the biggest drop", () => {
    const days = [
      day("2026-06-12", { alice: 1, bob: 2 }),
      day("2026-06-13", { alice: 4, bob: 1 }),
    ];

    const { biggestDrop } = findBiggestSingleDayMoves(days);

    expect(biggestDrop).toEqual({
      userId: "alice",
      fromDate: "2026-06-12",
      toDate: "2026-06-13",
      fromRank: 1,
      toRank: 4,
      delta: -3,
    });
  });

  it("keeps the first transition on a tie in magnitude", () => {
    const days = [
      day("2026-06-12", { alice: 3, bob: 1 }),
      day("2026-06-13", { alice: 1, bob: 3 }),
      day("2026-06-14", { alice: 3, bob: 1 }),
    ];

    const { biggestClimb } = findBiggestSingleDayMoves(days);

    // Both alice (day1->day2) and bob (day2->day3) climb by 2 — first wins.
    expect(biggestClimb).toEqual({
      userId: "alice",
      fromDate: "2026-06-12",
      toDate: "2026-06-13",
      fromRank: 3,
      toRank: 1,
      delta: 2,
    });
  });

  it("ignores users missing from either snapshot and zero-delta moves", () => {
    const days = [
      day("2026-06-12", { alice: 1 }),
      day("2026-06-13", { alice: 1, bob: 2 }),
    ];

    expect(findBiggestSingleDayMoves(days)).toEqual({
      biggestClimb: null,
      biggestDrop: null,
    });
  });
});
