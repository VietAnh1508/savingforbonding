import { z } from "zod";

import { isVotingOpen } from "~/lib/match";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import {
  emptyMatchVoteCounts,
  getVoteCountsByMatchId,
} from "~/server/services/match-vote-counts";

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

      const matches = await ctx.db.match.findMany({
        where: {
          status: { in: ["SCHEDULED", "LIVE", "POSTPONED"] },
        },
        orderBy: { kickoffAt: "asc" },
        take: limit,
      });

      const voteCountsByMatchId = await getVoteCountsByMatchId(
        ctx.db,
        matches.map((match) => match.id),
      );

      return matches.map((match) => ({
        ...match,
        voteCounts:
          voteCountsByMatchId.get(match.id) ?? emptyMatchVoteCounts(),
      }));
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

      const voteCountsByMatchId = await getVoteCountsByMatchId(ctx.db, [
        match.id,
      ]);

      return {
        ...match,
        votingOpen: isVotingOpen(match.kickoffAt, match.status),
        userVote,
        voteCounts:
          voteCountsByMatchId.get(match.id) ?? emptyMatchVoteCounts(),
      };
    }),
});
