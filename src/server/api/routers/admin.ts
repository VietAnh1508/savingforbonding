import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isMatchEditable, validateBettingRatios } from "~/lib/match";
import { hashPassword } from "~/lib/password";
import { computeRankHistory } from "~/lib/rank-history";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { resolveMatchVotes } from "~/server/services/resolve-votes";
import { syncFifaFixtures } from "~/server/services/sync-fifa-fixtures";

const matchStatusSchema = z.enum([
  "SCHEDULED",
  "LIVE",
  "POSTPONED",
  "CANCELLED",
]);

const matchInputSchema = z
  .object({
    homeCountry: z.string().min(1),
    awayCountry: z.string().min(1),
    kickoffAt: z.date(),
    tournament: z.string().min(1).default("FIFA World Cup"),
    homeRatio: z.number().min(0),
    awayRatio: z.number().min(0),
    status: matchStatusSchema.default("SCHEDULED"),
  })
  .superRefine((data, ctx) => {
    const error = validateBettingRatios(data.homeRatio, data.awayRatio);
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ["homeRatio"],
      });
    }
  });

const matchUpdateSchema = z
  .object({
    id: z.string(),
    homeCountry: z.string().min(1).optional(),
    awayCountry: z.string().min(1).optional(),
    kickoffAt: z.date().optional(),
    tournament: z.string().min(1).optional(),
    homeRatio: z.number().min(0).optional(),
    awayRatio: z.number().min(0).optional(),
    status: matchStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.homeRatio !== undefined && data.awayRatio !== undefined) {
      const error = validateBettingRatios(data.homeRatio, data.awayRatio);
      if (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
          path: ["homeRatio"],
        });
      }
    }
  });

export const adminRouter = createTRPCRouter({
  syncFromFifa: adminProcedure.mutation(async ({ ctx }) => {
    return syncFifaFixtures(ctx.db);
  }),

  repairBeerTotals: adminProcedure.mutation(async ({ ctx }) => {
    const [completedMatches, resolvedVotes, users] = await Promise.all([
      ctx.db.match.findMany({
        where: { status: "COMPLETED" },
        select: { id: true, kickoffAt: true, stage: { select: { name: true } } },
        orderBy: { kickoffAt: "asc" },
      }),
      ctx.db.vote.findMany({
        where: { match: { status: "COMPLETED" } },
        select: { userId: true, matchId: true, points: true, isCorrect: true },
      }),
      ctx.db.user.findMany({
        select: { id: true, name: true, image: true, totalPoints: true },
      }),
    ]);

    const matchInputs = completedMatches.map((match) => ({
      id: match.id,
      kickoffAt: match.kickoffAt,
      stage: match.stage?.name ?? null,
    }));

    // Reuses the same stage-aware no-bet penalty logic as the rank history
    // chart, so a repair can never diverge from what the chart/badges show.
    const { days } = computeRankHistory(matchInputs, resolvedVotes, users);
    const finalBeers = days[days.length - 1]?.beers ?? {};

    let usersUpdated = 0;

    for (const user of users) {
      const newTotalPoints = finalBeers[user.id] ?? 0;

      if (newTotalPoints !== user.totalPoints) {
        await ctx.db.user.update({
          where: { id: user.id },
          data: { totalPoints: newTotalPoints, weeklyPoints: newTotalPoints },
        });
        usersUpdated++;
      }
    }

    return { usersUpdated, completedMatchCount: completedMatches.length };
  }),

  listAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.match.findMany({
      orderBy: { kickoffAt: "asc" },
    });
  }),

  listUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        totalPoints: true,
        weeklyPoints: true,
        createdAt: true,
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: adminProcedure
    .input(matchInputSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.match.create({ data: input });
    }),

  update: adminProcedure
    .input(matchUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const match = await ctx.db.match.findUnique({ where: { id } });
      if (!match) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
      }
      if (!isMatchEditable(match.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Completed matches cannot be modified",
        });
      }

      const homeRatio = data.homeRatio ?? match.homeRatio;
      const awayRatio = data.awayRatio ?? match.awayRatio;
      const ratioError = validateBettingRatios(homeRatio, awayRatio);
      if (ratioError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: ratioError });
      }

      return ctx.db.match.update({ where: { id }, data });
    }),

  complete: adminProcedure
    .input(
      z.object({
        id: z.string(),
        homeScore: z.number().int().min(0),
        awayScore: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.db.match.findUnique({ where: { id: input.id } });
      if (!match) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
      }
      if (match.status === "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Match is already completed",
        });
      }

      return resolveMatchVotes(
        ctx.db,
        input.id,
        input.homeScore,
        input.awayScore,
      );
    }),

  resetUserPassword: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: input.id } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const passwordHash = await hashPassword("changeme123");
      await ctx.db.user.update({
        where: { id: input.id },
        data: { passwordHash, mustChangePassword: true },
      });
      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: input.id } });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      await ctx.db.user.delete({ where: { id: input.id } });
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.db.match.findUnique({ where: { id: input.id } });
      if (!match) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
      }
      if (!isMatchEditable(match.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Completed matches cannot be deleted",
        });
      }

      await ctx.db.match.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
