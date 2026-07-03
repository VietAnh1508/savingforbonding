import { toVNDate } from "~/lib/match";

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

export type RankHistoryResult = {
  days: DaySnapshot[];
  series: { userId: string; name: string | null; image: string | null }[];
};

export function computeRankHistory(
  completedMatches: MatchInput[],
  votes: VoteInput[],
  allUsers: UserInput[],
): RankHistoryResult {
  const votesByMatch = new Map<
    string,
    Map<string, { points: number; isCorrect: boolean | null }>
  >();
  for (const vote of votes) {
    if (!votesByMatch.has(vote.matchId)) votesByMatch.set(vote.matchId, new Map());
    votesByMatch.get(vote.matchId)!.set(vote.userId, {
      points: vote.points,
      isCorrect: vote.isCorrect,
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
            // Resolved vote: apply points, clamping at 0 (mirrors resolveMatchVotes behaviour)
            a.beers = Math.max(0, a.beers + vote.points);
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
  };
}
