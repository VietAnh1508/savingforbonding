import { z } from "zod";

import { isKnownCountry } from "~/lib/country-flag";
import {
  isRedStarEligibleStage,
  isVotingOpen,
  noVotePenaltyForStage,
  wrongPenaltyForStage,
  type MatchVoter,
} from "~/lib/match";
import { MatchStatus } from "../../../../generated/prisma";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  emptyMatchVoteCounts,
  getVoteCountsByMatchId,
} from "~/server/services/match-vote-counts";
import { getRedStarStartSequenceOrder } from "~/server/services/vote-star";

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
          include: { stage: { include: { penalty: true } } },
        })
      ).filter(
        (m) => isKnownCountry(m.homeCountry) && isKnownCountry(m.awayCountry),
      );

      const matchIds = matches.map((match) => match.id);

      const [voteCountsByMatchId, redStarStartOrder] = await Promise.all([
        getVoteCountsByMatchId(ctx.db, matchIds),
        getRedStarStartSequenceOrder(ctx.db),
      ]);

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
              starTier: true,
            },
          })
        : [];

      const userVoteByMatchId = new Map(
        userVotes.map((vote) => [vote.matchId, vote]),
      );

      return matches.map((match) => ({
        ...match,
        stage: match.stage?.name ?? null,
        stageWrongPenalty: wrongPenaltyForStage(match.stage?.penalty),
        stageNoVotePenalty: noVotePenaltyForStage(match.stage?.penalty),
        stageStarsAllocated: match.stage?.starsAllocated ?? 0,
        redStarEligible: isRedStarEligibleStage(
          match.stage?.sequenceOrder,
          redStarStartOrder,
        ),
        userVoteOutcome: userVoteByMatchId.get(match.id)?.outcome ?? null,
        userVoteResult: userVoteByMatchId.get(match.id) ?? null,
        voteCounts: voteCountsByMatchId.get(match.id) ?? emptyMatchVoteCounts(),
        votingOpen: isVotingOpen(match.kickoffAt, match.status),
      }));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [match, allVotes, userVote, redStarStartOrder] = await Promise.all([
        ctx.db.match.findUnique({
          where: { id: input.id },
          include: { stage: { include: { penalty: true } } },
        }),
        ctx.db.vote.findMany({
          where: { matchId: input.id },
          select: {
            outcome: true,
            starTier: true,
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
        getRedStarStartSequenceOrder(ctx.db),
      ]);

      if (!match) return null;

      const voteCounts = emptyMatchVoteCounts();
      const voters: {
        home: MatchVoter[];
        draw: MatchVoter[];
        away: MatchVoter[];
      } = { home: [], draw: [], away: [] };
      for (const v of allVotes) {
        const entry = { ...v.user, starTier: v.starTier };
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
        stage: match.stage?.name ?? null,
        stageWrongPenalty: wrongPenaltyForStage(match.stage?.penalty),
        stageNoVotePenalty: noVotePenaltyForStage(match.stage?.penalty),
        stageStarsAllocated: match.stage?.starsAllocated ?? 0,
        redStarEligible: isRedStarEligibleStage(
          match.stage?.sequenceOrder,
          redStarStartOrder,
        ),
        votingOpen: isVotingOpen(match.kickoffAt, match.status),
        userVote,
        voteCounts,
        voters,
      };
    }),
});
