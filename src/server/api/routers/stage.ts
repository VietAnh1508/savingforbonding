import { noVotePenaltyForStage, wrongPenaltyForStage } from "~/lib/match";
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
        starsAllocated: true,
        penalty: { select: { wrongPenalty: true, noVotePenalty: true } },
      },
    });
    return stages.map((stage) => ({
      ...stage,
      wrongPenalty: wrongPenaltyForStage(stage.penalty),
      noVotePenalty: noVotePenaltyForStage(stage.penalty),
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
        starsAllocated: true,
        maxStarMultiplier: true,
        penalty: { select: { wrongPenalty: true, noVotePenalty: true } },
      },
    });
    return stages.map((stage) => ({
      ...stage,
      wrongPenalty: wrongPenaltyForStage(stage.penalty),
      noVotePenalty: noVotePenaltyForStage(stage.penalty),
    }));
  }),
});
