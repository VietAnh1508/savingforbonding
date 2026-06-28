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
      const [match, allVotes, userVote] = await Promise.all([
        ctx.db.match.findUnique({ where: { id: input.id } }),
        ctx.db.vote.findMany({
          where: { matchId: input.id },
          select: {
            outcome: true,
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
      const voters = { home: [] as { id: string; name: string | null }[], draw: [] as { id: string; name: string | null }[], away: [] as { id: string; name: string | null }[] };
      for (const v of allVotes) {
        if (v.outcome === "HOME_WIN") { voteCounts.home++; voters.home.push(v.user); }
        else if (v.outcome === "DRAW") { voteCounts.draw++; voters.draw.push(v.user); }
        else if (v.outcome === "AWAY_WIN") { voteCounts.away++; voters.away.push(v.user); }
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
