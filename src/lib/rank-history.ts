import { allInResolvedPoints, toVNDate } from "~/lib/match";

type RankableEntry = {
  beers: number;
  accuracy: number;
  incorrectPredictions: number;
  missedPredictions: number;
};

// Shared sort comparator — used by both computeRankHistory and the global leaderboard
// to guarantee the chart's final-day ranks match the live leaderboard table exactly.
export function compareLeaderboardEntries(
  a: RankableEntry,
  b: RankableEntry,
): number {
  if (b.beers !== a.beers) return b.beers - a.beers;
  if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
  if (b.incorrectPredictions !== a.incorrectPredictions)
    return b.incorrectPredictions - a.incorrectPredictions;
  return b.missedPredictions - a.missedPredictions;
}

export function assignRanks<T extends RankableEntry>(
  sorted: T[],
): Array<T & { rank: number }> {
  const entries: Array<T & { rank: number }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]!;
    const prev = entries[i - 1];
    let rank: number;
    if (!prev) {
      rank = 1;
    } else if (
      prev.beers === entry.beers &&
      prev.accuracy === entry.accuracy &&
      prev.incorrectPredictions === entry.incorrectPredictions &&
      prev.missedPredictions === entry.missedPredictions
    ) {
      rank = prev.rank;
    } else {
      rank = prev.rank + 1;
    }
    entries.push({ ...entry, rank });
  }
  return entries;
}

export type MatchInput = {
  id: string;
  kickoffAt: Date;
  noVotePenalty: number;
};

export type VoteInput = {
  userId: string;
  matchId: string;
  points: number;
  // null = vote exists but match not yet resolved; user voted, no penalty, no points yet
  isCorrect: boolean | null;
  // All-in resolution (clear-to-zero/double) acts on the live total at
  // resolution time in production, which this replay can't reconstruct from
  // a stored point delta — so it's applied directly to the match bucket
  // instead of added like a normal vote. Optional so existing fixtures/tests
  // that only cover non-all-in votes don't need updating.
  isAllIn?: boolean;
};

export type UserInput = {
  id: string;
  name: string | null;
  image: string | null;
};

export type DaySnapshot = {
  date: string;
  ranks: Record<string, number>;
  beers: Record<string, number>;
};

export type BonusVoteInput = {
  userId: string;
  points: number;
};

// Champion/top-scorer votes settle once, on the day the Final completes —
// applied as two separately-clamped steps (champion, then top-scorer) to
// mirror resolveChampionVotes/resolveTopScorerVotes's two applyPointsDelta
// calls, each of which clamps totalPoints at 0 independently.
export type BonusRoundInput = {
  date: string;
  championVotes: BonusVoteInput[];
  topScorerVotes: BonusVoteInput[];
};

export type RankHistoryResult = {
  days: DaySnapshot[];
  series: { userId: string; name: string | null; image: string | null }[];
  bonusDay: {
    date: string;
    championPoints: Record<string, number>;
    topScorerPoints: Record<string, number>;
  } | null;
};

export type RankMove = {
  userId: string;
  fromDate: string;
  toDate: string;
  fromRank: number;
  toRank: number;
  delta: number; // fromRank - toRank; positive = climbed, negative = dropped
};

// "One day" here means one match day (a day with a completed match) — the
// only granularity DaySnapshots are sampled at, since there's nothing to
// diff on a day with no completed matches.
export function findBiggestSingleDayMoves(days: DaySnapshot[]): {
  biggestClimb: RankMove | null;
  biggestDrop: RankMove | null;
} {
  let biggestClimb: RankMove | null = null;
  let biggestDrop: RankMove | null = null;

  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1]!;
    const curr = days[i]!;
    for (const userId of Object.keys(curr.ranks)) {
      const fromRank = prev.ranks[userId];
      const toRank = curr.ranks[userId];
      if (fromRank === undefined || toRank === undefined) continue;

      const delta = fromRank - toRank;
      if (delta === 0) continue;

      const move: RankMove = {
        userId,
        fromDate: prev.date,
        toDate: curr.date,
        fromRank,
        toRank,
        delta,
      };

      if (delta > 0 && (!biggestClimb || delta > biggestClimb.delta)) {
        biggestClimb = move;
      } else if (delta < 0 && (!biggestDrop || delta < biggestDrop.delta)) {
        biggestDrop = move;
      }
    }
  }

  return { biggestClimb, biggestDrop };
}

function toPointsRecord(entries: BonusVoteInput[]): Record<string, number> {
  const record: Record<string, number> = {};
  for (const entry of entries) {
    record[entry.userId] = (record[entry.userId] ?? 0) + entry.points;
  }
  return record;
}

export function computeRankHistory(
  completedMatches: MatchInput[],
  votes: VoteInput[],
  allUsers: UserInput[],
  bonus?: BonusRoundInput,
): RankHistoryResult {
  const votesByMatch = new Map<
    string,
    Map<string, { points: number; isCorrect: boolean | null; isAllIn: boolean }>
  >();
  for (const vote of votes) {
    if (!votesByMatch.has(vote.matchId)) votesByMatch.set(vote.matchId, new Map());
    votesByMatch.get(vote.matchId)!.set(vote.userId, {
      points: vote.points,
      isCorrect: vote.isCorrect,
      isAllIn: vote.isAllIn ?? false,
    });
  }

  const matchesByDate = new Map<string, MatchInput[]>();
  for (const match of completedMatches) {
    const date = toVNDate(match.kickoffAt);
    if (!matchesByDate.has(date)) matchesByDate.set(date, []);
    matchesByDate.get(date)!.push(match);
  }

  const accum = new Map<
    string,
    { beers: number; correct: number; incorrect: number }
  >();
  for (const user of allUsers) {
    accum.set(user.id, { beers: 0, correct: 0, incorrect: 0 });
  }

  const championPointsByUser = bonus ? toPointsRecord(bonus.championVotes) : {};
  const topScorerPointsByUser = bonus ? toPointsRecord(bonus.topScorerVotes) : {};

  const orderedDates = [...matchesByDate.keys()].sort();
  let cumulativeMatchCount = 0;
  const days: DaySnapshot[] = [];

  for (const date of orderedDates) {
    const matches = matchesByDate.get(date) ?? [];
    for (const match of matches) {
      cumulativeMatchCount++;
      const matchVotes = votesByMatch.get(match.id) ?? new Map();
      for (const user of allUsers) {
        const a = accum.get(user.id)!;
        const vote = matchVotes.get(user.id);
        if (vote) {
          if (vote.isCorrect !== null) {
            // Resolved vote: apply points, clamping at 0 (mirrors resolveMatchVotes
            // behaviour). All-in is the one exception — it resolves against the
            // *reconstructed* running total directly (clear to 0 / double) rather
            // than adding a stored delta, since that delta was computed against
            // production's live total at resolution time, which a replay can't
            // otherwise reproduce (see allInResolvedPoints callers).
            a.beers = vote.isAllIn
              ? allInResolvedPoints(vote.isCorrect, a.beers)
              : Math.max(0, a.beers + vote.points);
            if (vote.isCorrect) a.correct++;
            else a.incorrect++;
          }
          // Unresolved vote (isCorrect === null): user voted, so no no-vote penalty,
          // but points are not yet settled — contribute nothing until resolution.
        } else {
          a.beers += match.noVotePenalty;
        }
      }
    }

    if (bonus && date === bonus.date) {
      for (const user of allUsers) {
        const a = accum.get(user.id)!;
        // Two separately-clamped steps, champion then top-scorer — see BonusRoundInput.
        a.beers = Math.max(0, a.beers + (championPointsByUser[user.id] ?? 0));
        a.beers = Math.max(0, a.beers + (topScorerPointsByUser[user.id] ?? 0));
      }
    }

    const snapshot = allUsers.map((user) => {
      const a = accum.get(user.id)!;
      const totalVoted = a.correct + a.incorrect;
      return {
        userId: user.id,
        beers: a.beers,
        accuracy: totalVoted > 0 ? a.correct / totalVoted : 0,
        incorrectPredictions: a.incorrect,
        missedPredictions: cumulativeMatchCount - a.correct - a.incorrect,
      };
    });

    snapshot.sort(compareLeaderboardEntries);

    const ranked = assignRanks(snapshot);
    const ranks: Record<string, number> = {};
    const beers: Record<string, number> = {};
    for (const r of ranked) {
      ranks[r.userId] = r.rank;
      beers[r.userId] = r.beers;
    }
    days.push({ date, ranks, beers });
  }

  return {
    days,
    series: allUsers.map((u) => ({ userId: u.id, name: u.name, image: u.image })),
    bonusDay: bonus
      ? {
          date: bonus.date,
          championPoints: championPointsByUser,
          topScorerPoints: topScorerPointsByUser,
        }
      : null,
  };
}
