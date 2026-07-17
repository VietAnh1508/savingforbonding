import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  isMatchEditable,
  noVotePenaltyForStage,
  validateVotingRatios,
  validateStagePenalty,
  validateStageStars,
  validateMaxStarMultiplier,
} from "~/lib/match";
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
    const error = validateVotingRatios(data.homeRatio, data.awayRatio);
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
      const error = validateVotingRatios(data.homeRatio, data.awayRatio);
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
    const [completedMatches, resolvedVotes, users, championVotes, allInUsers] =
      await Promise.all([
        ctx.db.match.findMany({
          where: { status: "COMPLETED" },
          select: {
            id: true,
            kickoffAt: true,
            stage: { select: { penalty: true } },
          },
          orderBy: { kickoffAt: "asc" },
        }),
        ctx.db.vote.findMany({
          where: { match: { status: "COMPLETED" } },
          select: { userId: true, matchId: true, points: true, isCorrect: true },
        }),
        ctx.db.user.findMany({
          select: { id: true, name: true, image: true, totalPoints: true },
        }),
        ctx.db.championVote.findMany({
          select: { userId: true, points: true },
        }),
        ctx.db.vote.findMany({
          where: { isAllIn: true, isCorrect: { not: null } },
          select: { userId: true },
        }),
      ]);

    const matchInputs = completedMatches.map((match) => ({
      id: match.id,
      kickoffAt: match.kickoffAt,
      noVotePenalty: noVotePenaltyForStage(match.stage?.penalty),
    }));

    // Reuses the same stage-aware no-vote penalty logic as the rank history
    // chart, so a repair can never diverge from what the chart/badges show.
    const { days } = computeRankHistory(matchInputs, resolvedVotes, users);
    const finalBeers = days[days.length - 1]?.beers ?? {};
    const championPointsByUser = new Map(
      championVotes.map((v) => [v.userId, v.points]),
    );
    // The replay above is a fixed additive fold and can't reproduce an
    // all-in vote's clear-to-zero/double effect (which depends on the live
    // balance at resolution time, not a fixed delta) — skip these users so
    // repair doesn't overwrite their correct live totals with a wrong value.
    const allInUserIds = new Set(allInUsers.map((v) => v.userId));

    let usersUpdated = 0;

    for (const user of users) {
      if (allInUserIds.has(user.id)) continue;

      const baseBeers = finalBeers[user.id] ?? 0;
      const championPoints = championPointsByUser.get(user.id) ?? 0;
      const newTotalPoints = Math.max(0, baseBeers + championPoints);

      if (newTotalPoints !== user.totalPoints) {
        await ctx.db.user.update({
          where: { id: user.id },
          data: { totalPoints: newTotalPoints },
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
      const ratioError = validateVotingRatios(homeRatio, awayRatio);
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

      // Challenge.match cascades on delete — block instead of silently
      // wiping out an unresolved challenge between two users.
      const activeChallengeCount = await ctx.db.challenge.count({
        where: {
          matchId: input.id,
          status: { notIn: ["REJECTED", "CANCELLED", "DONE"] },
        },
      });
      if (activeChallengeCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete: ${activeChallengeCount} active challenge(s) reference this match. Resolve or cancel them first.`,
        });
      }

      await ctx.db.match.delete({ where: { id: input.id } });
      return { success: true };
    }),

  listStagePenalties: adminProcedure.query(async ({ ctx }) => {
    const stages = await ctx.db.stage.findMany({
      include: {
        penalty: true,
        _count: { select: { matches: { where: { status: "COMPLETED" } } } },
      },
      orderBy: { sequenceOrder: "asc" },
    });
    return stages.map(({ _count, ...stage }) => ({
      ...stage,
      hasCompletedMatch: _count.matches > 0,
    }));
  }),

  updateStagePenalty: adminProcedure
    .input(
      z
        .object({
          stageId: z.string(),
          wrongPenalty: z.number().int().min(0),
          noVotePenalty: z.number().int().min(0),
        })
        .superRefine((data, ctx) => {
          const error = validateStagePenalty(data.wrongPenalty, data.noVotePenalty);
          if (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: error,
              path: ["wrongPenalty"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { stageId, wrongPenalty, noVotePenalty } = input;

      const completedMatch = await ctx.db.match.findFirst({
        where: { stageId, status: "COMPLETED" },
        select: { id: true },
      });
      if (completedMatch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot edit penalties for a stage that already has completed matches",
        });
      }

      return ctx.db.stagePenalty.upsert({
        where: { stageId },
        update: { wrongPenalty, noVotePenalty },
        create: { stageId, wrongPenalty, noVotePenalty },
      });
    }),

  updateStageStars: adminProcedure
    .input(
      z
        .object({ stageId: z.string(), starsAllocated: z.number().int().min(0) })
        .superRefine((data, ctx) => {
          const error = validateStageStars(data.starsAllocated);
          if (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: error,
              path: ["starsAllocated"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { stageId, starsAllocated } = input;

      const completedMatch = await ctx.db.match.findFirst({
        where: { stageId, status: "COMPLETED" },
        select: { id: true },
      });
      if (completedMatch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot edit stars for a stage that already has completed matches",
        });
      }

      return ctx.db.stage.update({
        where: { id: stageId },
        data: { starsAllocated },
      });
    }),

  updateStageMaxMultiplier: adminProcedure
    .input(
      z
        .object({ stageId: z.string(), maxStarMultiplier: z.number().int() })
        .superRefine((data, ctx) => {
          const error = validateMaxStarMultiplier(data.maxStarMultiplier);
          if (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: error,
              path: ["maxStarMultiplier"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { stageId, maxStarMultiplier } = input;

      const completedMatch = await ctx.db.match.findFirst({
        where: { stageId, status: "COMPLETED" },
        select: { id: true },
      });
      if (completedMatch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot edit max multiplier for a stage that already has completed matches",
        });
      }

      return ctx.db.stage.update({
        where: { id: stageId },
        data: { maxStarMultiplier },
      });
    }),

  updateStageAllInEnabled: adminProcedure
    .input(z.object({ stageId: z.string(), allInEnabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { stageId, allInEnabled } = input;

      const completedMatch = await ctx.db.match.findFirst({
        where: { stageId, status: "COMPLETED" },
        select: { id: true },
      });
      if (completedMatch) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot edit All In for a stage that already has completed matches",
        });
      }

      return ctx.db.stage.update({
        where: { id: stageId },
        data: { allInEnabled },
      });
    }),

  getGameSettings: adminProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.gameSettings.findUnique({ where: { id: 1 } });
    return (
      settings ?? {
        id: 1,
        championMaxStarMultiplier: 4,
        topScorerMaxStarMultiplier: 4,
      }
    );
  }),

  updateChampionMaxMultiplier: adminProcedure
    .input(
      z
        .object({ championMaxStarMultiplier: z.number().int() })
        .superRefine((data, ctx) => {
          const error = validateMaxStarMultiplier(data.championMaxStarMultiplier);
          if (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: error,
              path: ["championMaxStarMultiplier"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { championMaxStarMultiplier } = input;
      return ctx.db.gameSettings.upsert({
        where: { id: 1 },
        create: { id: 1, championMaxStarMultiplier },
        update: { championMaxStarMultiplier },
      });
    }),

  updateTopScorerMaxMultiplier: adminProcedure
    .input(
      z
        .object({ topScorerMaxStarMultiplier: z.number().int() })
        .superRefine((data, ctx) => {
          const error = validateMaxStarMultiplier(
            data.topScorerMaxStarMultiplier,
          );
          if (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: error,
              path: ["topScorerMaxStarMultiplier"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const { topScorerMaxStarMultiplier } = input;
      return ctx.db.gameSettings.upsert({
        where: { id: 1 },
        create: { id: 1, topScorerMaxStarMultiplier },
        update: { topScorerMaxStarMultiplier },
      });
    }),
});
