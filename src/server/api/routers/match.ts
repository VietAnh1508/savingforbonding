import { z } from "zod";

import { isVotingOpen } from "~/lib/match";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const matchRouter = createTRPCRouter({
  listUpcoming: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      return ctx.db.match.findMany({
        where: {
          status: { in: ["SCHEDULED", "LIVE", "POSTPONED"] },
        },
        orderBy: { kickoffAt: "asc" },
        take: limit,
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const match = await ctx.db.match.findUnique({
        where: { id: input.id },
      });

      if (!match) return null;

      const userVote = ctx.session?.user
        ? await ctx.db.vote.findUnique({
            where: {
              userId_matchId: {
                userId: ctx.session.user.id,
                matchId: match.id,
              },
            },
          })
        : null;

      return {
        ...match,
        votingOpen: isVotingOpen(match.kickoffAt, match.status),
        userVote,
      };
    }),
});
