import { type PrismaClient } from "../../../../generated/prisma";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

async function fetchLeaderboardUsers(db: PrismaClient) {
  try {
    return await db.user.findMany({
      orderBy: [{ totalPoints: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        image: true,
        totalPoints: true,
        createdAt: true,
        _count: {
          select: {
            votes: { where: { isCorrect: true } },
          },
        },
      },
    });
  } catch (error) {
    console.warn(
      "Leaderboard query without User.createdAt; run db push to enable joining dates.",
      error,
    );

    const users = await db.user.findMany({
      orderBy: [{ totalPoints: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        image: true,
        totalPoints: true,
        _count: {
          select: {
            votes: { where: { isCorrect: true } },
          },
        },
      },
    });

    return users.map((user) => ({ ...user, createdAt: null }));
  }
}

export const leaderboardRouter = createTRPCRouter({
  global: publicProcedure.query(async ({ ctx }) => {
    const users = await fetchLeaderboardUsers(ctx.db);

    return users.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      name: user.name,
      image: user.image,
      joiningDate: user.createdAt,
      beers: user.totalPoints,
      correctPredictions: user._count.votes,
    }));
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
