import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isVotingOpen } from "~/lib/match";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const voteOutcomeSchema = z.enum(["HOME_WIN", "DRAW", "AWAY_WIN"]);

export const voteRouter = createTRPCRouter({
  cast: protectedProcedure
    .input(
      z.object({
        matchId: z.string(),
        outcome: voteOutcomeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.db.match.findUnique({
        where: { id: input.matchId },
      });

      if (!match) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
      }

      if (!isVotingOpen(match.kickoffAt, match.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voting is closed for this match",
        });
      }

      return ctx.db.vote.upsert({
        where: {
          userId_matchId: {
            userId: ctx.session.user.id,
            matchId: input.matchId,
          },
        },
        create: {
          userId: ctx.session.user.id,
          matchId: input.matchId,
          outcome: input.outcome,
        },
        update: {
          outcome: input.outcome,
        },
      });
    }),

  castBatch: protectedProcedure
    .input(
      z.array(
        z.object({
          matchId: z.string(),
          outcome: voteOutcomeSchema,
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { saved: 0, skipped: 0 };

      const matches = await ctx.db.match.findMany({
        where: { id: { in: input.map((v) => v.matchId) } },
      });

      const openMatchIds = new Set(
        matches
          .filter((m) => isVotingOpen(m.kickoffAt, m.status))
          .map((m) => m.id),
      );

      const votable = input.filter((v) => openMatchIds.has(v.matchId));

      await Promise.all(
        votable.map((v) =>
          ctx.db.vote.upsert({
            where: {
              userId_matchId: {
                userId: ctx.session.user.id,
                matchId: v.matchId,
              },
            },
            create: {
              userId: ctx.session.user.id,
              matchId: v.matchId,
              outcome: v.outcome,
            },
            update: { outcome: v.outcome },
          }),
        ),
      );

      return { saved: votable.length, skipped: input.length - votable.length };
    }),

  getMyVotes: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      return ctx.db.vote.findMany({
        where: { userId: ctx.session.user.id },
        include: { match: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }),

  getMyMissedMatches: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const userId = ctx.session.user.id;

      return ctx.db.match.findMany({
        where: {
          status: "COMPLETED",
          votes: { none: { userId } },
        },
        orderBy: { kickoffAt: "desc" },
        take: limit,
      });
    }),

  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [totalVotes, correctVotes, incorrectVotes, completedMatchCount, user] =
      await Promise.all([
        ctx.db.vote.count({ where: { userId } }),
        ctx.db.vote.count({ where: { userId, isCorrect: true } }),
        ctx.db.vote.count({ where: { userId, isCorrect: false } }),
        ctx.db.match.count({ where: { status: "COMPLETED" } }),
        ctx.db.user.findUnique({
          where: { id: userId },
          select: { totalPoints: true, weeklyPoints: true },
        }),
      ]);

    const accuracy =
      totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0;
    const missedVotes = completedMatchCount - correctVotes - incorrectVotes;

    return {
      totalVotes,
      correctVotes,
      incorrectVotes,
      missedVotes,
      accuracy,
      totalBeers: user?.totalPoints ?? 0,
      weeklyBeers: user?.weeklyPoints ?? 0,
    };
  }),
});
