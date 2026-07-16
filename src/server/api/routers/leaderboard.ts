import { isKnownCountry } from "~/lib/country-flag";
import {
  noVotePenaltyForStage,
  toVNDate,
  vnTodayTomorrowRangeUTC,
} from "~/lib/match";
import {
  assignRanks,
  compareLeaderboardEntries,
  computeRankHistory,
} from "~/lib/rank-history";
import { resolveUserJoiningDate } from "~/lib/user-joining-date";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { MatchStatus, type PrismaClient } from "../../../../generated/prisma";

const leaderboardUserSelect = {
  id: true,
  name: true,
  image: true,
  totalPoints: true,
};

async function fetchLeaderboardUsers(db: PrismaClient) {
  try {
    return await db.user.findMany({
      orderBy: [{ totalPoints: "desc" }],
      select: { ...leaderboardUserSelect, createdAt: true },
    });
  } catch (error) {
    console.warn(
      "Leaderboard query without User.createdAt; run db push to enable joining dates.",
      error,
    );

    return db.user.findMany({
      orderBy: [{ totalPoints: "desc" }],
      select: leaderboardUserSelect,
    });
  }
}

async function getSortedLeaderboardEntries(db: PrismaClient) {
  const [users, voteCounts, completedMatchCount] = await Promise.all([
    fetchLeaderboardUsers(db),
    db.vote.groupBy({
      by: ["userId", "isCorrect"],
      where: { isCorrect: { not: null } },
      _count: { _all: true },
    }),
    db.match.count({ where: { status: "COMPLETED" } }),
  ]);

  const voteCountMap = new Map<
    string,
    { correct: number; incorrect: number }
  >();
  for (const vc of voteCounts) {
    if (vc.isCorrect === null) continue;
    const entry = voteCountMap.get(vc.userId) ?? { correct: 0, incorrect: 0 };
    if (vc.isCorrect) entry.correct = vc._count._all;
    else entry.incorrect = vc._count._all;
    voteCountMap.set(vc.userId, entry);
  }

  const unsortedEntries = users.map((user) => {
    const createdAt =
      "createdAt" in user && user.createdAt instanceof Date
        ? user.createdAt
        : null;

    const { correct, incorrect } = voteCountMap.get(user.id) ?? {
      correct: 0,
      incorrect: 0,
    };
    const totalVotes = correct + incorrect;
    const accuracy = totalVotes > 0 ? correct / totalVotes : 0;

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      joiningDate: resolveUserJoiningDate({
        createdAt,
        earliestVoteAt: null,
      }),
      beers: user.totalPoints,
      correctPredictions: correct,
      incorrectPredictions: incorrect,
      missedPredictions: completedMatchCount - correct - incorrect,
      accuracy,
    };
  });

  return unsortedEntries.sort(compareLeaderboardEntries);
}

export const leaderboardRouter = createTRPCRouter({
  global: publicProcedure.query(async ({ ctx }) => {
    const [sorted, lastVoteUpdate, lastMatchUpdate] = await Promise.all([
      getSortedLeaderboardEntries(ctx.db),
      ctx.db.vote.findFirst({
        where: { isCorrect: { not: null } },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      ctx.db.match.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

    const candidates = [
      lastVoteUpdate?.updatedAt,
      lastMatchUpdate?.updatedAt,
    ].filter((d): d is Date => d instanceof Date);
    const lastUpdated =
      candidates.length > 0
        ? new Date(Math.max(...candidates.map((d) => d.getTime())))
        : null;

    const entries = assignRanks(sorted);

    return { entries, lastUpdated };
  }),

  bottomThreePicks: publicProcedure.query(async ({ ctx }) => {
    const sorted = await getSortedLeaderboardEntries(ctx.db);
    const bottomUsers = sorted.slice(-3).map((entry) => ({
      id: entry.id,
      name: entry.name,
      image: entry.image,
    }));
    const userIds = bottomUsers.map((u) => u.id);

    const { start, end } = vnTodayTomorrowRangeUTC();
    const rawMatches = await ctx.db.match.findMany({
      where: {
        kickoffAt: { gte: start, lt: end },
        status: {
          in: [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.POSTPONED],
        },
      },
      orderBy: { kickoffAt: "asc" },
      select: { id: true, homeCountry: true, awayCountry: true, kickoffAt: true },
    });
    const matches = rawMatches.filter(
      (m) => isKnownCountry(m.homeCountry) && isKnownCountry(m.awayCountry),
    );
    const matchIds = matches.map((m) => m.id);

    const votes =
      userIds.length > 0 && matchIds.length > 0
        ? await ctx.db.vote.findMany({
            where: { userId: { in: userIds }, matchId: { in: matchIds } },
            select: { userId: true, matchId: true, outcome: true, starMultiplier: true },
          })
        : [];

    return { users: bottomUsers, matches, votes };
  }),

  totalBeerPool: publicProcedure.query(async ({ ctx }) => {
    const [aggregate, contributors] = await Promise.all([
      ctx.db.user.aggregate({
        _sum: { totalPoints: true },
        _count: { _all: true },
      }),
      ctx.db.user.count({
        where: { totalPoints: { gt: 0 } },
      }),
    ]);

    return {
      totalBeers: aggregate._sum.totalPoints ?? 0,
      contributorCount: contributors,
      userCount: aggregate._count._all,
    };
  }),

  beerByDay: publicProcedure.query(async ({ ctx }) => {
    const [completedMatches, voteAggs, totalUsers] = await Promise.all([
      ctx.db.match.findMany({
        where: { status: "COMPLETED" },
        select: {
          id: true,
          kickoffAt: true,
          stage: { select: { penalty: true } },
        },
        orderBy: { kickoffAt: "asc" },
      }),
      ctx.db.vote.groupBy({
        by: ["matchId"],
        where: { isCorrect: { not: null } },
        _sum: { points: true },
        _count: { _all: true },
      }),
      ctx.db.user.count(),
    ]);

    const voteAggMap = new Map<
      string,
      { pointsSum: number; voteCount: number }
    >();
    for (const agg of voteAggs) {
      voteAggMap.set(agg.matchId, {
        pointsSum: agg._sum.points ?? 0,
        voteCount: agg._count._all,
      });
    }

    const dayMap = new Map<string, number>();
    for (const match of completedMatches) {
      const date = toVNDate(match.kickoffAt);
      const { pointsSum, voteCount } = voteAggMap.get(match.id) ?? {
        pointsSum: 0,
        voteCount: 0,
      };
      const noVoteBeers =
        (totalUsers - voteCount) * noVotePenaltyForStage(match.stage?.penalty);
      dayMap.set(date, (dayMap.get(date) ?? 0) + pointsSum + noVoteBeers);
    }

    const days = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return days.map(([date, daily]) => {
      cumulative += daily;
      return { date, daily, cumulative };
    });
  }),

  rankByDay: publicProcedure.query(async ({ ctx }) => {
    const [completedMatches, resolvedVotes, allUsers] = await Promise.all([
      ctx.db.match.findMany({
        where: { status: "COMPLETED" },
        select: { id: true, kickoffAt: true, stage: { select: { penalty: true } } },
        orderBy: { kickoffAt: "asc" },
      }),
      ctx.db.vote.findMany({
        where: { match: { status: "COMPLETED" } },
        select: { userId: true, matchId: true, points: true, isCorrect: true },
      }),
      ctx.db.user.findMany({ select: { id: true, name: true, image: true } }),
    ]);

    const matchInputs = completedMatches.map((match) => ({
      id: match.id,
      kickoffAt: match.kickoffAt,
      noVotePenalty: noVotePenaltyForStage(match.stage?.penalty),
    }));

    return computeRankHistory(matchInputs, resolvedVotes, allUsers);
  }),

  topFollowed: publicProcedure.query(async ({ ctx }) => {
    const counts = await ctx.db.userFollow.groupBy({
      by: ["followingId"],
      _count: { _all: true },
      orderBy: { _count: { followingId: "desc" } },
      take: 3,
    });
    if (counts.length === 0) return [];

    const users = await ctx.db.user.findMany({
      where: { id: { in: counts.map((c) => c.followingId) } },
      select: { id: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return counts.flatMap((c) => {
      const user = userMap.get(c.followingId);
      return user ? [{ ...user, followerCount: c._count._all }] : [];
    });
  }),
});
