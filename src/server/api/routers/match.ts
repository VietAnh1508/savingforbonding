import { z } from "zod";

import { MatchStatus } from "../../../../generated/prisma";
import { isKnownCountry } from "~/lib/country-flag";
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
  listMatches: publicProcedure
    .input(z.object({ filter: z.enum(["upcoming", "completed"]).optional() }))
    .query(async ({ ctx, input }) => {
      let statuses: MatchStatus[] | undefined;
      if (input.filter === "completed") {
        statuses = [MatchStatus.COMPLETED];
      } else if (input.filter === "upcoming") {
        statuses = [MatchStatus.SCHEDULED, MatchStatus.LIVE, MatchStatus.POSTPONED];
      }

      const matches = (
        await ctx.db.match.findMany({
          where: statuses ? { status: { in: statuses } } : undefined,
          orderBy: { kickoffAt: "asc" },
        })
      ).filter(
        (m) => isKnownCountry(m.homeCountry) && isKnownCountry(m.awayCountry),
      );

      const matchIds = matches.map((match) => match.id);

      const voteCountsByMatchId = await getVoteCountsByMatchId(
        ctx.db,
        matchIds,
      );

      const userVotes = ctx.session?.user
        ? await ctx.db.vote.findMany({
            where: {
              userId: ctx.session.user.id,
              matchId: { in: matchIds },
            },
            select: { matchId: true, outcome: true },
          })
        : [];

      const userVoteByMatchId = new Map(
        userVotes.map((vote) => [vote.matchId, vote.outcome]),
      );

      return matches.map((match) => ({
        ...match,
        userVoteOutcome: userVoteByMatchId.get(match.id) ?? null,
        voteCounts:
          voteCountsByMatchId.get(match.id) ?? emptyMatchVoteCounts(),
        votingOpen: isVotingOpen(match.kickoffAt, match.status),
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
