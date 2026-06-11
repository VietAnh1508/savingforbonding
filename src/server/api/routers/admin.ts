import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isMatchEditable, validateBettingRatios } from "~/lib/match";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { resolveMatchVotes } from "~/server/services/resolve-votes";

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
  listAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.match.findMany({
      orderBy: { kickoffAt: "asc" },
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
