import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { type PrismaClient } from "../../../../generated/prisma";
import {
  clampStarMultiplier,
  isStarEligibleStage,
  isVotingOpen,
  starMultiplierSchema,
} from "~/lib/match";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const voteOutcomeSchema = z.enum(["HOME_WIN", "DRAW", "AWAY_WIN"]);

async function mirrorToFollowers(
  db: PrismaClient,
  userId: string,
  votes: { matchId: string; outcome: "HOME_WIN" | "DRAW" | "AWAY_WIN" }[],
) {
  if (votes.length === 0) return;

  // Re-check voting window at write time — the leader may have cast just before
  // the window closed, so we must not write locked-match votes to followers.
  const matchIds = votes.map((v) => v.matchId);
  const matches = await db.match.findMany({
    where: { id: { in: matchIds } },
    select: { id: true, kickoffAt: true, status: true },
  });
  const openMatchIdSet = new Set(
    matches
      .filter((m) => isVotingOpen(m.kickoffAt, m.status))
      .map((m) => m.id),
  );
  const openVotes = votes.filter((v) => openMatchIdSet.has(v.matchId));
  if (openVotes.length === 0) return;

  const followers = await db.userFollow.findMany({
    where: { followingId: userId },
    select: { followerId: true },
  });
  if (followers.length === 0) return;

  const followerIds = followers.map((f) => f.followerId);
  const openMatchIds = openVotes.map((v) => v.matchId);

  // Wrap read + write in a transaction so a follower voting manually between
  // the two calls cannot cause a unique-constraint violation.
  await db.$transaction(async (tx) => {
    const existing = await tx.vote.findMany({
      where: { userId: { in: followerIds }, matchId: { in: openMatchIds } },
      select: { userId: true, matchId: true },
    });
    const existingSet = new Set(existing.map((e) => `${e.userId}:${e.matchId}`));
    const toCreate = followers.flatMap((f) =>
      openVotes
        .filter((v) => !existingSet.has(`${f.followerId}:${v.matchId}`))
        .map((v) => ({
          userId: f.followerId,
          matchId: v.matchId,
          outcome: v.outcome,
        })),
    );
    if (toCreate.length > 0) {
      await tx.vote.createMany({ data: toCreate });
    }
  });
}

// Returns source user's votes on open matches that the target user has not yet voted on.
// Used by both copyFromUser and getOpenMatchCountForFollow so the count in the
// confirmation dialog always agrees with what copyFromUser will actually write.
async function getVotesToCopy(
  db: PrismaClient,
  sourceUserId: string,
  targetUserId: string,
) {
  const allMatches = await db.match.findMany({
    select: { id: true, kickoffAt: true, status: true },
  });
  const openMatchIds = new Set(
    allMatches
      .filter((m) => isVotingOpen(m.kickoffAt, m.status))
      .map((m) => m.id),
  );
  if (openMatchIds.size === 0) return [];

  const [sourceVotes, targetVotes] = await Promise.all([
    db.vote.findMany({
      where: { userId: sourceUserId, matchId: { in: [...openMatchIds] } },
      select: { matchId: true, outcome: true },
    }),
    db.vote.findMany({
      where: { userId: targetUserId, matchId: { in: [...openMatchIds] } },
      select: { matchId: true },
    }),
  ]);

  const targetVotedIds = new Set(targetVotes.map((v) => v.matchId));
  return sourceVotes.filter((v) => !targetVotedIds.has(v.matchId));
}

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

      const vote = await ctx.db.vote.upsert({
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

      await mirrorToFollowers(ctx.db, ctx.session.user.id, [
        { matchId: input.matchId, outcome: input.outcome },
      ]);

      return vote;
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

      await mirrorToFollowers(ctx.db, ctx.session.user.id, votable);

      return { saved: votable.length, skipped: input.length - votable.length };
    }),

  follow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot follow yourself",
        });
      }
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!targetUser) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User not found" });
      }
      return ctx.db.$transaction(async (tx) => {
        await tx.userFollow.deleteMany({
          where: { followerId: ctx.session.user.id },
        });
        return tx.userFollow.create({
          data: {
            followerId: ctx.session.user.id,
            followingId: input.userId,
          },
        });
      });
    }),

  unfollow: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.userFollow.deleteMany({
      where: { followerId: ctx.session.user.id },
    });
  }),

  getFollowing: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.userFollow.findFirst({
      where: { followerId: ctx.session.user.id },
      include: {
        following: { select: { id: true, name: true, image: true } },
      },
    });
  }),

  getMyFollowers: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.userFollow.findMany({
      where: { followingId: ctx.session.user.id },
      include: {
        follower: { select: { id: true, name: true, image: true } },
      },
    });
  }),

  copyFromUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const candidateVotes = await getVotesToCopy(
        ctx.db,
        input.userId,
        ctx.session.user.id,
      );
      if (candidateVotes.length === 0) return { copied: 0 };

      // Re-check inside a transaction: the user may have voted on some of these
      // matches between getVotesToCopy and the write below.
      return ctx.db.$transaction(async (tx) => {
        const alreadyVoted = await tx.vote.findMany({
          where: {
            userId: ctx.session.user.id,
            matchId: { in: candidateVotes.map((v) => v.matchId) },
          },
          select: { matchId: true },
        });
        const alreadyVotedIds = new Set(alreadyVoted.map((v) => v.matchId));
        const toCreate = candidateVotes.filter(
          (v) => !alreadyVotedIds.has(v.matchId),
        );
        if (toCreate.length === 0) return { copied: 0 };
        await tx.vote.createMany({
          data: toCreate.map((v) => ({
            userId: ctx.session.user.id,
            matchId: v.matchId,
            outcome: v.outcome,
          })),
        });
        return { copied: toCreate.length };
      });
    }),

  getOpenMatchCountForFollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const votes = await getVotesToCopy(
        ctx.db,
        input.userId,
        ctx.session.user.id,
      );
      return { count: votes.length };
    }),

  getMyVotes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.vote.findMany({
      where: { userId: ctx.session.user.id },
      include: { match: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  getMyMissedMatches: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return ctx.db.match.findMany({
      where: {
        status: "COMPLETED",
        votes: { none: { userId } },
      },
      include: { stage: { include: { penalty: true } } },
      orderBy: { kickoffAt: "desc" },
    });
  }),

  setStar: protectedProcedure
    .input(z.object({ matchId: z.string(), multiplier: starMultiplierSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.$transaction(async (tx) => {
        const [vote, match] = await Promise.all([
          tx.vote.findUnique({
            where: { userId_matchId: { userId, matchId: input.matchId } },
          }),
          tx.match.findUnique({
            where: { id: input.matchId },
            select: {
              stageId: true,
              stage: { select: { starsAllocated: true, maxStarMultiplier: true } },
              kickoffAt: true,
              status: true,
            },
          }),
        ]);

        if (!vote) {
          throw new TRPCError({ code: "NOT_FOUND", message: "You haven't voted on this match" });
        }
        if (!match) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        }
        if (!isVotingOpen(match.kickoffAt, match.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Voting is closed for this match" });
        }

        const allocated = match.stage?.starsAllocated ?? 0;
        if (allocated === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Stars are not available for this stage" });
        }

        // Only gate *placing* a star — updating or removing one that's
        // already placed is always allowed, even if the stage's max was
        // lowered afterward (e.g. by the admin). The value is just clamped
        // to the current max instead of being rejected outright.
        if (vote.starMultiplier === null && input.multiplier !== null) {
          if (!isStarEligibleStage(match.stage?.maxStarMultiplier)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Stars are not available for this stage",
            });
          }

          const usedStars = await tx.vote.count({
            where: { userId, starMultiplier: { not: null }, match: { stageId: match.stageId } },
          });
          if (usedStars >= allocated) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `No stars remaining for this stage`,
            });
          }
        }

        const nextMultiplier =
          input.multiplier === null
            ? null
            : clampStarMultiplier(input.multiplier, match.stage?.maxStarMultiplier ?? 0);

        return tx.vote.update({
          where: { id: vote.id },
          // Placing a star gives up all-in — the two are mutually exclusive.
          data: {
            starMultiplier: nextMultiplier,
            ...(nextMultiplier !== null ? { isAllIn: false } : {}),
          },
        });
      });
    }),

  setAllIn: protectedProcedure
    .input(z.object({ matchId: z.string(), isAllIn: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.$transaction(async (tx) => {
        const [vote, match] = await Promise.all([
          tx.vote.findUnique({
            where: { userId_matchId: { userId, matchId: input.matchId } },
          }),
          tx.match.findUnique({
            where: { id: input.matchId },
            select: {
              stage: { select: { allInEnabled: true } },
              kickoffAt: true,
              status: true,
            },
          }),
        ]);

        if (!vote) {
          throw new TRPCError({ code: "NOT_FOUND", message: "You haven't voted on this match" });
        }
        if (!match) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
        }
        if (!isVotingOpen(match.kickoffAt, match.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Voting is closed for this match" });
        }
        if (input.isAllIn && !match.stage?.allInEnabled) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "All In is not available for this stage" });
        }

        return tx.vote.update({
          where: { id: vote.id },
          // Going all-in gives up any placed star — mutually exclusive.
          data: {
            isAllIn: input.isAllIn,
            ...(input.isAllIn ? { starMultiplier: null } : {}),
          },
        });
      });
    }),

  getStarAllotments: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [stages, starredVotes] = await Promise.all([
      ctx.db.stage.findMany({
        where: { starsAllocated: { gt: 0 } },
        select: { name: true, starsAllocated: true, maxStarMultiplier: true },
      }),
      ctx.db.vote.findMany({
        where: { userId, starMultiplier: { not: null } },
        select: { match: { select: { stage: { select: { name: true } } } } },
      }),
    ]);

    const usedByStage = new Map<string, number>();
    for (const vote of starredVotes) {
      const stage = vote.match.stage?.name ?? null;
      if (stage === null) continue;
      usedByStage.set(stage, (usedByStage.get(stage) ?? 0) + 1);
    }

    return stages.map(({ name, starsAllocated, maxStarMultiplier }) => ({
      stage: name,
      allocated: starsAllocated,
      used: usedByStage.get(name) ?? 0,
      remaining: starsAllocated - (usedByStage.get(name) ?? 0),
      maxStarMultiplier,
    }));
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
          select: { totalPoints: true },
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
    };
  }),
});
