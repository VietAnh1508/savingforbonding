import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isChallengeableMatch, maxStakeBeers } from "~/lib/challenge";
import { isKnownCountry } from "~/lib/country-flag";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// Shared by listMine and listCommunity so the two tabs can't drift apart.
const challengeListInclude = {
  challenger: { select: { id: true, name: true, image: true } },
  opponent: { select: { id: true, name: true, image: true } },
  match: {
    select: {
      id: true,
      homeCountry: true,
      awayCountry: true,
      kickoffAt: true,
      status: true,
    },
  },
} as const;

// SQLite/libSQL serializes writers — under concurrent submitPick calls on the
// same challenge, one transaction can transiently fail to acquire the write
// lock. Retry a couple of times before giving up; anything else (validation
// errors, FORBIDDEN, etc.) rethrows immediately.
async function retryOnBusy<T>(fn: () => Promise<T>): Promise<T> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isBusy = /SQLITE_BUSY|database is locked|write conflict/i.test(
        message,
      );
      if (!isBusy || attempt === MAX_ATTEMPTS) throw err;
    }
  }
  throw new Error("unreachable");
}

export const challengeRouter = createTRPCRouter({
  // Powers the create-challenge modal in one round trip: opponent list with
  // their current beer totals, own beer total, and eligible (not-yet-started) matches.
  getCreateContext: protectedProcedure.query(async ({ ctx }) => {
    const [me, others, matches] = await Promise.all([
      ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.session.user.id },
        select: { totalPoints: true },
      }),
      ctx.db.user.findMany({
        where: { id: { not: ctx.session.user.id } },
        select: { id: true, name: true, image: true, totalPoints: true },
        orderBy: { name: "asc" },
      }),
      ctx.db.match.findMany({
        where: { status: "SCHEDULED", kickoffAt: { gt: new Date() } },
        orderBy: { kickoffAt: "asc" },
        select: {
          id: true,
          homeCountry: true,
          awayCountry: true,
          kickoffAt: true,
        },
      }),
    ]);
    return {
      myTotalPoints: me.totalPoints,
      others,
      matches: matches.filter(
        (m) => isKnownCountry(m.homeCountry) && isKnownCountry(m.awayCountry),
      ),
    };
  }),

  create: protectedProcedure
    .input(
      z.object({
        opponentId: z.string(),
        matchId: z.string(),
        stakeBeers: z.number().int().min(1),
        condition: z.string().trim().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.opponentId === userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot challenge yourself",
        });
      }

      const [challenger, opponent, match] = await Promise.all([
        ctx.db.user.findUnique({
          where: { id: userId },
          select: { totalPoints: true },
        }),
        ctx.db.user.findUnique({
          where: { id: input.opponentId },
          select: { totalPoints: true },
        }),
        ctx.db.match.findUnique({ where: { id: input.matchId } }),
      ]);
      if (!opponent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Opponent not found" });
      }
      if (!match) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
      }
      if (!isChallengeableMatch(match)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Match has already started",
        });
      }

      // Server-side recompute — never trust the client's cap.
      const cap = maxStakeBeers(challenger?.totalPoints ?? 0, opponent.totalPoints);
      if (cap < 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One of you has no beers to stake",
        });
      }
      if (input.stakeBeers > cap) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Stake cannot exceed ${cap} beers`,
        });
      }

      return ctx.db.challenge.create({
        data: {
          challengerId: userId,
          opponentId: input.opponentId,
          matchId: input.matchId,
          stakeBeers: input.stakeBeers,
          condition: input.condition,
        },
      });
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.challenge.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
      include: challengeListInclude,
      orderBy: { updatedAt: "desc" },
    });
  }),

  // Public so logged-out visitors can browse the community feed — only
  // creating/responding to challenges requires a session. Shows every
  // challenge, including the caller's own (those also surface under
  // "My challenges" for logged-in users).
  listCommunity: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.challenge.findMany({
      include: challengeListInclude,
      orderBy: { updatedAt: "desc" },
    });
  }),

  getOpenIncomingCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.challenge.count({
      where: { opponentId: ctx.session.user.id, status: "OPEN" },
    });
    return { count };
  }),

  respond: protectedProcedure
    .input(z.object({ id: z.string(), action: z.enum(["ACCEPT", "REJECT"]) }))
    .mutation(async ({ ctx, input }) => {
      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.id },
        include: { match: true },
      });
      if (!challenge) throw new TRPCError({ code: "NOT_FOUND" });
      if (challenge.opponentId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (input.action === "ACCEPT" && !isChallengeableMatch(challenge.match)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Match has already started",
        });
      }

      const nextStatus = input.action === "ACCEPT" ? "ACCEPTED" : "REJECTED";
      const res = await ctx.db.challenge.updateMany({
        where: { id: input.id, status: "OPEN" },
        data: { status: nextStatus },
      });
      if (res.count === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Challenge already responded to",
        });
      }
      return { status: nextStatus };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const challenge = await ctx.db.challenge.findUnique({
        where: { id: input.id },
      });
      if (!challenge) throw new TRPCError({ code: "NOT_FOUND" });
      if (challenge.challengerId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const res = await ctx.db.challenge.updateMany({
        where: { id: input.id, status: "OPEN" },
        data: { status: "CANCELLED" },
      });
      if (res.count === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Challenge can no longer be cancelled",
        });
      }
      return { status: "CANCELLED" as const };
    }),

  submitPick: protectedProcedure
    .input(z.object({ id: z.string(), pickedUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return retryOnBusy(() => ctx.db.$transaction(async (tx) => {
        const challenge = await tx.challenge.findUnique({
          where: { id: input.id },
        });
        if (!challenge) throw new TRPCError({ code: "NOT_FOUND" });

        const isChallenger = challenge.challengerId === userId;
        const isOpponent = challenge.opponentId === userId;
        if (!isChallenger && !isOpponent) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (challenge.status !== "REVIEW" && challenge.status !== "CONFLICT") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Challenge is not awaiting resolution",
          });
        }
        if (
          input.pickedUserId !== challenge.challengerId &&
          input.pickedUserId !== challenge.opponentId
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid pick" });
        }

        const pickField = isChallenger
          ? "challengerPickedWinnerId"
          : "opponentPickedWinnerId";
        const updated = await tx.challenge.update({
          where: { id: input.id },
          data: { [pickField]: input.pickedUserId },
        });

        const otherPick = isChallenger
          ? updated.opponentPickedWinnerId
          : updated.challengerPickedWinnerId;

        if (!otherPick) return updated; // waiting on the other player

        if (otherPick !== input.pickedUserId) {
          return tx.challenge.update({
            where: { id: input.id },
            data: { status: "CONFLICT" },
          });
        }

        // Agreement — settle exactly once via a CAS-guarded status transition.
        const settleRes = await tx.challenge.updateMany({
          where: { id: input.id, status: { in: ["REVIEW", "CONFLICT"] } },
          data: { status: "DONE", winnerId: input.pickedUserId, resolvedAt: new Date() },
        });

        if (settleRes.count === 1) {
          const winnerId = input.pickedUserId;
          const loserId =
            winnerId === challenge.challengerId
              ? challenge.opponentId
              : challenge.challengerId;

          const winner = await tx.user.findUniqueOrThrow({
            where: { id: winnerId },
            select: { totalPoints: true },
          });
          const winnerNewTotal = Math.max(
            0,
            winner.totalPoints - challenge.stakeBeers,
          );
          const winnerDelta = winnerNewTotal - winner.totalPoints;

          await tx.user.update({
            where: { id: winnerId },
            data: { totalPoints: winnerNewTotal },
          });
          await tx.user.update({
            where: { id: loserId },
            data: { totalPoints: { increment: challenge.stakeBeers } },
          });

          const challengerDelta =
            winnerId === challenge.challengerId ? winnerDelta : challenge.stakeBeers;
          const opponentDelta =
            winnerId === challenge.opponentId ? winnerDelta : challenge.stakeBeers;

          await tx.challenge.update({
            where: { id: input.id },
            data: {
              challengerPoints: challengerDelta,
              opponentPoints: opponentDelta,
            },
          });
        }

        return tx.challenge.findUniqueOrThrow({ where: { id: input.id } });
      }));
    }),
});
