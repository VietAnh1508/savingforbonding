import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  clampStarMultiplier,
  isStarEligibleStage,
  starMultiplierSchema,
} from "~/lib/match";
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
    const [deadline, maxStarMultiplier] = await Promise.all([
      getTopScorerVotingDeadline(ctx.db),
      getTopScorerMaxStarMultiplier(ctx.db),
    ]);
    return {
      isOpen: !deadline || new Date() < deadline,
      deadline,
      maxStarMultiplier,
    };
  }),

  getMyVote: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.topScorerVote.findUnique({
      where: { userId: ctx.session.user.id },
      include: { candidate: true },
    });
  }),

  getVoteCounts: publicProcedure.query(async ({ ctx }) => {
    const [candidates, votes] = await Promise.all([
      ctx.db.topScorerCandidate.findMany({
        orderBy: { goals: "desc" },
      }),
      ctx.db.topScorerVote.findMany({
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
      if (!(await isTopScorerVotingOpen(ctx.db))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Top scorer voting is closed",
        });
      }

      const candidate = await ctx.db.topScorerCandidate.findUnique({
        where: { id: input.candidateId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
      }

      const existingVote = await ctx.db.topScorerVote.findUnique({
        where: { userId: ctx.session.user.id },
      });
      const changingCandidate =
        !!existingVote && existingVote.candidateId !== input.candidateId;

      return ctx.db.topScorerVote.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
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
      const vote = await ctx.db.topScorerVote.findUnique({
        where: { userId: ctx.session.user.id },
      });
      if (!vote || !vote.candidateId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You haven't picked a top scorer yet",
        });
      }

      if (!(await isTopScorerVotingOpen(ctx.db))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Top scorer voting is closed",
        });
      }

      const maxMultiplier = await getTopScorerMaxStarMultiplier(ctx.db);

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
        where: { userId: ctx.session.user.id },
        data: { starMultiplier: nextMultiplier },
      });
    }),
});
