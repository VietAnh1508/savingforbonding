import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const leaderboardRouter = createTRPCRouter({
  global: publicProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
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
