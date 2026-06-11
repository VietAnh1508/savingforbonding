import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const leaderboardRouter = createTRPCRouter({
  global: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      const users = await ctx.db.user.findMany({
        where: { totalPoints: { gt: 0 } },
        orderBy: { totalPoints: "desc" },
        take: limit,
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

      return users.map((user, index) => ({
        rank: index + 1,
        id: user.id,
        name: user.name,
        image: user.image,
        beers: user.totalPoints,
        correctPredictions: user._count.votes,
      }));
    }),

  weekly: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      const users = await ctx.db.user.findMany({
        where: { weeklyPoints: { gt: 0 } },
        orderBy: { weeklyPoints: "desc" },
        take: limit,
        select: {
          id: true,
          name: true,
          image: true,
          weeklyPoints: true,
        },
      });

      return users.map((user, index) => ({
        rank: index + 1,
        id: user.id,
        name: user.name,
        image: user.image,
        beers: user.weeklyPoints,
      }));
    }),
});
