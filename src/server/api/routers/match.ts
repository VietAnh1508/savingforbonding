import { z } from "zod";

import { isKnownCountry } from "~/lib/country-flag";
import { isVotingOpen, type MatchVoter } from "~/lib/match";
import { MatchStatus } from "../../../../generated/prisma";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
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
        statuses = [
          MatchStatus.SCHEDULED,
          MatchStatus.LIVE,
          MatchStatus.POSTPONED,
        ];
      }

      const matches = (
        await ctx.db.match.findMany({
          where: {
            ...(statuses ? { status: { in: statuses } } : undefined),
          },
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
            select: {
              matchId: true,
              outcome: true,
              isCorrect: true,
              points: true,
              hasStar: true,
            },
          })
        : [];

      const userVoteByMatchId = new Map(
        userVotes.map((vote) => [vote.matchId, vote]),
      );

      return matches.map((match) => ({
        ...match,
        userVoteOutcome: userVoteByMatchId.get(match.id)?.outcome ?? null,
        userVoteResult: userVoteByMatchId.get(match.id) ?? null,
        voteCounts: voteCountsByMatchId.get(match.id) ?? emptyMatchVoteCounts(),
        votingOpen: isVotingOpen(match.kickoffAt, match.status),
      }));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [match, allVotes, userVote] = await Promise.all([
        ctx.db.match.findUnique({ where: { id: input.id } }),
        ctx.db.vote.findMany({
          where: { matchId: input.id },
          select: {
            outcome: true,
            hasStar: true,
            user: { select: { id: true, name: true } },
          },
        }),
        ctx.session?.user
          ? ctx.db.vote.findUnique({
              where: {
                userId_matchId: {
                  userId: ctx.session.user.id,
                  matchId: input.id,
                },
              },
            })
          : null,
      ]);

      if (!match) return null;

      const voteCounts = emptyMatchVoteCounts();
      const voters: {
        home: MatchVoter[];
        draw: MatchVoter[];
        away: MatchVoter[];
      } = { home: [], draw: [], away: [] };
      for (const v of allVotes) {
        const entry = { ...v.user, hasStar: v.hasStar };
        if (v.outcome === "HOME_WIN") {
          voteCounts.home++;
          voters.home.push(entry);
        } else if (v.outcome === "DRAW") {
          voteCounts.draw++;
          voters.draw.push(entry);
        } else if (v.outcome === "AWAY_WIN") {
          voteCounts.away++;
          voters.away.push(entry);
        }
      }

      return {
        ...match,
        votingOpen: isVotingOpen(match.kickoffAt, match.status),
        userVote,
        voteCounts,
        voters,
      };
    }),
});
