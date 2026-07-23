import { TRPCError } from "@trpc/server";

import { pickRandomBeerAmount } from "~/lib/beer-amount-spin";
import { getActiveTournamentId } from "~/server/services/active-tournament";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { type PrismaClient } from "../../../../generated/prisma";

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

    // Upsert rather than create-only: the modal lets a player re-spin once
    // before locking in, which just overwrites this row with the latest
    // roll. The @@unique constraint on [userId, tournamentId] still caps
    // it at one row per player per tournament.
    return ctx.db.beerAmountSpin.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      create: { userId, tournamentId, amount },
      update: { amount },
    });
  }),
});
