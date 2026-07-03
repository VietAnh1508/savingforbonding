import { BEER_LOSE, BEER_NO_VOTE } from "~/lib/match";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const stageRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const stages = await ctx.db.stage.findMany({
      orderBy: { sequenceOrder: "asc" },
      select: {
        id: true,
        name: true,
        sequenceOrder: true,
        isKnockout: true,
        penalty: { select: { wrongPenalty: true, noVotePenalty: true } },
      },
    });
    return stages.map((stage) => ({
      ...stage,
      wrongPenalty: stage.penalty?.wrongPenalty ?? BEER_LOSE,
      noVotePenalty: stage.penalty?.noVotePenalty ?? BEER_NO_VOTE,
    }));
  }),

  listKnockout: publicProcedure.query(async ({ ctx }) => {
    const stages = await ctx.db.stage.findMany({
      where: { isKnockout: true },
      orderBy: { sequenceOrder: "asc" },
      select: {
        id: true,
        name: true,
        sequenceOrder: true,
        penalty: { select: { wrongPenalty: true, noVotePenalty: true } },
      },
    });
    return stages.map((stage) => ({
      ...stage,
      wrongPenalty: stage.penalty?.wrongPenalty ?? BEER_LOSE,
      noVotePenalty: stage.penalty?.noVotePenalty ?? BEER_NO_VOTE,
    }));
  }),
});
