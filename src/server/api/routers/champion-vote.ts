import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
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
    const deadline = await getChampionVotingDeadline(ctx.db);
    return {
      isOpen: !deadline || new Date() < deadline,
      deadline,
    };
  }),

  getMyVote: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.championVote.findUnique({
      where: { userId: ctx.session.user.id },
      include: { candidate: true },
    });
  }),

  getVoteCounts: publicProcedure.query(async ({ ctx }) => {
    const [candidates, votes] = await Promise.all([
      ctx.db.championCandidate.findMany({
        orderBy: { teamName: "asc" },
      }),
      ctx.db.championVote.findMany({
        select: {
          candidateId: true,
          starTier: true,
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    return candidates.map((candidate) => {
      const voters = votes
        .filter((v) => v.candidateId === candidate.id)
        .map((v) => ({ ...v.user, starTier: v.starTier }));
      return { candidate, count: voters.length, voters };
    });
  }),

  cast: protectedProcedure
    .input(z.object({ candidateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!(await isChampionVotingOpen(ctx.db))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Champion voting is closed",
        });
      }

      const candidate = await ctx.db.championCandidate.findUnique({
        where: { id: input.candidateId },
      });
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }
      if (candidate.eliminatedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This team has been eliminated",
        });
      }

      const existingVote = await ctx.db.championVote.findUnique({
        where: { userId: ctx.session.user.id },
      });
      const changingCandidate =
        !!existingVote && existingVote.candidateId !== input.candidateId;

      return ctx.db.championVote.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          candidateId: input.candidateId,
        },
        update: {
          candidateId: input.candidateId,
          ...(changingCandidate && { starTier: null }),
        },
      });
    }),

  toggleStar: protectedProcedure
    .input(z.object({ tier: z.enum(["YELLOW", "RED"]) }))
    .mutation(async ({ ctx, input }) => {
      const vote = await ctx.db.championVote.findUnique({
        where: { userId: ctx.session.user.id },
      });
      if (!vote || !vote.candidateId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You haven't picked a champion yet",
        });
      }

      if (!(await isChampionVotingOpen(ctx.db))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Champion voting is closed",
        });
      }

      const nextTier = vote.starTier === input.tier ? null : input.tier;

      return ctx.db.championVote.update({
        where: { userId: ctx.session.user.id },
        data: { starTier: nextTier },
      });
    }),
});
