import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  clampStarMultiplier,
  isStarEligibleStage,
  starMultiplierSchema,
} from "~/lib/match";
import { getActiveTournamentId } from "~/server/services/active-tournament";
import {
  getTopScorerMaxStarMultiplier,
  getTopScorerVotingDeadline,
  isTopScorerVotingOpen,
} from "~/server/services/top-scorer-vote";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const topScorerVoteRouter = createTRPCRouter({
  getVotingStatus: publicProcedure.query(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    const [deadline, maxStarMultiplier] = await Promise.all([
      getTopScorerVotingDeadline(ctx.db, tournamentId),
      getTopScorerMaxStarMultiplier(ctx.db, tournamentId),
    ]);
    return {
      isOpen: !deadline || new Date() < deadline,
      deadline,
      maxStarMultiplier,
    };
  }),

  getMyVote: protectedProcedure.query(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    return ctx.db.topScorerVote.findUnique({
      where: {
        userId_tournamentId: { userId: ctx.session.user.id, tournamentId },
      },
      include: { candidate: true },
    });
  }),

  getVoteCounts: publicProcedure.query(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    const [candidates, votes] = await Promise.all([
      ctx.db.topScorerCandidate.findMany({
        where: { tournamentId },
        // Same tiebreak rule as compareGoldenBoot (goals, then assists, then
        // fewest minutes played) — Prisma can't take a JS comparator, so it's
        // expressed here as a declarative multi-column sort instead.
        orderBy: [
          { goals: "desc" },
          { assists: "desc" },
          { minutesPlayed: "asc" },
        ],
      }),
      ctx.db.topScorerVote.findMany({
        where: { tournamentId },
        select: {
          candidateId: true,
          starMultiplier: true,
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    return candidates.map((candidate) => {
      const voters = votes
        .filter((v) => v.candidateId === candidate.id)
        .map((v) => ({ ...v.user, starMultiplier: v.starMultiplier }));
      return { candidate, count: voters.length, voters };
    });
  }),

  cast: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [tournamentId, candidate] = await Promise.all([
        getActiveTournamentId(ctx.db),
        ctx.db.topScorerCandidate.findUnique({
          where: { id: input.candidateId },
        }),
      ]);

      if (!(await isTopScorerVotingOpen(ctx.db, tournamentId))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Top scorer voting is closed",
        });
      }

      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
      }

      const voteWhere = {
        userId_tournamentId: { userId: ctx.session.user.id, tournamentId },
      };

      const existingVote = await ctx.db.topScorerVote.findUnique({
        where: voteWhere,
      });
      const changingCandidate =
        !!existingVote && existingVote.candidateId !== input.candidateId;

      return ctx.db.topScorerVote.upsert({
        where: voteWhere,
        create: {
          userId: ctx.session.user.id,
          tournamentId,
          candidateId: input.candidateId,
        },
        update: {
          candidateId: input.candidateId,
          ...(changingCandidate && { starMultiplier: null }),
        },
      });
    }),

  setStar: protectedProcedure
    .input(z.object({ multiplier: starMultiplierSchema }))
    .mutation(async ({ ctx, input }) => {
      const tournamentId = await getActiveTournamentId(ctx.db);
      const voteWhere = {
        userId_tournamentId: { userId: ctx.session.user.id, tournamentId },
      };

      const vote = await ctx.db.topScorerVote.findUnique({
        where: voteWhere,
      });
      if (!vote || !vote.candidateId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You haven't picked a top scorer yet",
        });
      }

      if (!(await isTopScorerVotingOpen(ctx.db, tournamentId))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Top scorer voting is closed",
        });
      }

      const maxMultiplier = await getTopScorerMaxStarMultiplier(
        ctx.db,
        tournamentId,
      );

      if (vote.starMultiplier === null && input.multiplier !== null) {
        if (!isStarEligibleStage(maxMultiplier)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stars are not available for top scorer voting",
          });
        }
      }

      const nextMultiplier =
        input.multiplier === null
          ? null
          : clampStarMultiplier(input.multiplier, maxMultiplier);

      return ctx.db.topScorerVote.update({
        where: voteWhere,
        data: { starMultiplier: nextMultiplier },
      });
    }),
});
