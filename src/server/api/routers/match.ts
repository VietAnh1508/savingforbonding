import { z } from "zod";

import { MatchStatus } from "../../../../generated/prisma";
import { isKnownCountry } from "~/lib/country-flag";
import { isVotingOpen } from "~/lib/match";

const STAGE_FLAGS: [string, string | undefined][] = [
  ["First Stage", process.env.STAGE_FIRST_STAGE],
  ["Round of 32", process.env.STAGE_ROUND_OF_32],
  ["Round of 16", process.env.STAGE_ROUND_OF_16],
  ["Quarter-final", process.env.STAGE_QUARTER_FINAL],
  ["Semi-final", process.env.STAGE_SEMI_FINAL],
  ["Play-off for third place", process.env.STAGE_THIRD_PLACE],
  ["Final", process.env.STAGE_FINAL],
];

const ACTIVE_STAGES = STAGE_FLAGS
  .filter(([, flag]) => flag === "true")
  .map(([stage]) => stage);

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
          where: {
            ...(statuses ? { status: { in: statuses } } : undefined),
            OR: [
              { stage: null },
              ...(ACTIVE_STAGES.length > 0
                ? [{ stage: { in: ACTIVE_STAGES } }]
                : []),
            ],
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
            select: { matchId: true, outcome: true, isCorrect: true, points: true },
          })
        : [];

      const userVoteByMatchId = new Map(
        userVotes.map((vote) => [vote.matchId, vote]),
      );

      return matches.map((match) => ({
        ...match,
        userVoteOutcome: userVoteByMatchId.get(match.id)?.outcome ?? null,
        userVoteResult: userVoteByMatchId.get(match.id) ?? null,
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

      const [userVote, voteCountsByMatchId, allVotes] = await Promise.all([
        ctx.session?.user
          ? ctx.db.vote.findUnique({
              where: {
                userId_matchId: {
                  userId: ctx.session.user.id,
                  matchId: match.id,
                },
              },
            })
          : null,
        getVoteCountsByMatchId(ctx.db, [match.id]),
        ctx.db.vote.findMany({
          where: { matchId: match.id },
          select: {
            outcome: true,
            user: { select: { id: true, name: true } },
          },
        }),
      ]);

      const voters = {
        home: allVotes.filter((v) => v.outcome === "HOME_WIN").map((v) => v.user),
        draw: allVotes.filter((v) => v.outcome === "DRAW").map((v) => v.user),
        away: allVotes.filter((v) => v.outcome === "AWAY_WIN").map((v) => v.user),
      };

      return {
        ...match,
        votingOpen: isVotingOpen(match.kickoffAt, match.status),
        userVote,
        voteCounts: voteCountsByMatchId.get(match.id) ?? emptyMatchVoteCounts(),
        voters,
      };
    }),
});
