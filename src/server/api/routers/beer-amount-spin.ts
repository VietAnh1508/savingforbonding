import { TRPCError } from "@trpc/server";

import { pickRandomBeerAmount } from "~/lib/beer-amount-spin";
import { getActiveTournamentId } from "~/server/services/active-tournament";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { Prisma, type PrismaClient } from "../../../../generated/prisma";

async function isSpinEnabled(db: PrismaClient, tournamentId: string) {
  const settings = await db.gameSettings.findUnique({
    where: { tournamentId },
    select: { beerAmountSpinEnabled: true },
  });
  return settings?.beerAmountSpinEnabled ?? false;
}

export const beerAmountSpinRouter = createTRPCRouter({
  getStatus: publicProcedure.query(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    return { enabled: await isSpinEnabled(ctx.db, tournamentId) };
  }),

  getMySpin: protectedProcedure.query(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    return ctx.db.beerAmountSpin.findUnique({
      where: {
        userId_tournamentId: { userId: ctx.session.user.id, tournamentId },
      },
    });
  }),

  spin: protectedProcedure.mutation(async ({ ctx }) => {
    const tournamentId = await getActiveTournamentId(ctx.db);
    const userId = ctx.session.user.id;

    if (!(await isSpinEnabled(ctx.db, tournamentId))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Spinning isn't open yet.",
      });
    }

    const amount = pickRandomBeerAmount();

    // No pre-check for an existing spin — the @@unique constraint on
    // [userId, tournamentId] is the actual guard (also closes the race
    // between two concurrent requests a separate pre-check wouldn't), so
    // just attempt the create and translate a P2002 into a clean CONFLICT.
    try {
      return await ctx.db.beerAmountSpin.create({
        data: { userId, tournamentId, amount },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You've already spun.",
        });
      }
      throw error;
    }
  }),
});
