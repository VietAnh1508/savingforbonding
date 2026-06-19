import { type PrismaClient } from "../../../../generated/prisma";
import { resolveUserJoiningDate } from "~/lib/user-joining-date";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const leaderboardUserSelect = {
  id: true,
  name: true,
  image: true,
  totalPoints: true,
  votes: {
    select: { createdAt: true, isCorrect: true },
    orderBy: { createdAt: "asc" as const },
  },
};

async function fetchLeaderboardUsers(db: PrismaClient) {
  try {
    return await db.user.findMany({
      orderBy: [{ totalPoints: "desc" }, { name: "asc" }],
      select: {
        ...leaderboardUserSelect,
        createdAt: true,
      },
    });
  } catch (error) {
    console.warn(
      "Leaderboard query without User.createdAt; run db push to enable joining dates.",
      error,
    );

    return db.user.findMany({
      orderBy: [{ totalPoints: "desc" }, { name: "asc" }],
      select: leaderboardUserSelect,
    });
  }
}

export const leaderboardRouter = createTRPCRouter({
  global: publicProcedure.query(async ({ ctx }) => {
    const [users, completedMatchCount, lastVoteUpdate, lastMatchUpdate] =
      await Promise.all([
        fetchLeaderboardUsers(ctx.db),
        ctx.db.match.count({ where: { status: "COMPLETED" } }),
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

    const entries = users.map((user, index) => {
      const createdAt =
        "createdAt" in user && user.createdAt instanceof Date
          ? user.createdAt
          : null;

      const correct = user.votes.filter((v) => v.isCorrect === true).length;
      const incorrect = user.votes.filter((v) => v.isCorrect === false).length;

      return {
        rank: index + 1,
        id: user.id,
        name: user.name,
        image: user.image,
        joiningDate: resolveUserJoiningDate({
          createdAt,
          earliestVoteAt: user.votes[0]?.createdAt ?? null,
        }),
        beers: user.totalPoints,
        correctPredictions: correct,
        incorrectPredictions: incorrect,
        missedPredictions: completedMatchCount - correct - incorrect,
      };
    });

    return { entries, lastUpdated };
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
});
