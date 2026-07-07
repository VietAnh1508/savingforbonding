import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isChampionVotingOpen } from "~/server/services/champion-vote";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const championVoteRouter = createTRPCRouter({
  getVotingStatus: publicProcedure.query(async ({ ctx }) => {
    return { isOpen: await isChampionVotingOpen(ctx.db) };
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
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    return candidates.map((candidate) => {
      const voters = votes
        .filter((v) => v.candidateId === candidate.id)
        .map((v) => v.user);
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

      return ctx.db.championVote.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          candidateId: input.candidateId,
        },
        update: {
          candidateId: input.candidateId,
        },
      });
    }),
});
