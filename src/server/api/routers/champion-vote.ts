import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  clampStarMultiplier,
  isStarEligibleStage,
  starMultiplierSchema,
} from "~/lib/match";
import { getActiveTournamentId } from "~/server/services/active-tournament";
import {
  getChampionMaxStarMultiplier,
  getChampionVotingDeadline,
  isChampionVotingOpen,
} from "~/server/services/champion-vote";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const championVoteRouter = createTRPCRouter({
  getVotingStatus: publicProcedure.query(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    const [deadline, maxStarMultiplier] = await Promise.all([
      getChampionVotingDeadline(ctx.db, tournamentId),
      getChampionMaxStarMultiplier(ctx.db, tournamentId),
    ]);
    return {
      isOpen: !deadline || new Date() < deadline,
      deadline,
      maxStarMultiplier,
    };
  }),

  getMyVote: protectedProcedure.query(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    return ctx.db.championVote.findUnique({
      where: {
        userId_tournamentId: { userId: ctx.session.user.id, tournamentId },
      },
      include: { candidate: true },
    });
  }),

  getVoteCounts: publicProcedure.query(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    const [candidates, votes] = await Promise.all([
      ctx.db.championCandidate.findMany({
        where: { tournamentId },
        orderBy: { teamName: "asc" },
      }),
      ctx.db.championVote.findMany({
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
        ctx.db.championCandidate.findUnique({
          where: { id: input.candidateId },
        }),
      ]);

      if (!(await isChampionVotingOpen(ctx.db, tournamentId))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Champion voting is closed",
        });
      }

      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }
      if (candidate.eliminatedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This team has been eliminated",
        });
      }

      const voteWhere = {
        userId_tournamentId: { userId: ctx.session.user.id, tournamentId },
      };

      const existingVote = await ctx.db.championVote.findUnique({
        where: voteWhere,
      });
      const changingCandidate =
        !!existingVote && existingVote.candidateId !== input.candidateId;

      return ctx.db.championVote.upsert({
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

      const vote = await ctx.db.championVote.findUnique({
        where: voteWhere,
      });
      if (!vote || !vote.candidateId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You haven't picked a champion yet",
        });
      }

      if (!(await isChampionVotingOpen(ctx.db, tournamentId))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Champion voting is closed",
        });
      }

      const maxMultiplier = await getChampionMaxStarMultiplier(
        ctx.db,
        tournamentId,
      );

      if (vote.starMultiplier === null && input.multiplier !== null) {
        if (!isStarEligibleStage(maxMultiplier)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Stars are not available for champion voting",
          });
        }
      }

      const nextMultiplier =
        input.multiplier === null
          ? null
          : clampStarMultiplier(input.multiplier, maxMultiplier);

      return ctx.db.championVote.update({
        where: voteWhere,
        data: { starMultiplier: nextMultiplier },
      });
    }),
});
