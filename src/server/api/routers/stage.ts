import {
  isRedStarEligibleStage,
  noVotePenaltyForStage,
  wrongPenaltyForStage,
} from "~/lib/match";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getRedStarStartSequenceOrder } from "~/server/services/vote-star";

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
    const [stages, redStarStartSequenceOrder] = await Promise.all([
      ctx.db.stage.findMany({
        where: { isKnockout: true },
        orderBy: { sequenceOrder: "asc" },
        select: {
          id: true,
          name: true,
          sequenceOrder: true,
          starsAllocated: true,
          penalty: { select: { wrongPenalty: true, noVotePenalty: true } },
        },
      }),
      getRedStarStartSequenceOrder(ctx.db),
    ]);
    return stages.map((stage) => ({
      ...stage,
      wrongPenalty: wrongPenaltyForStage(stage.penalty),
      noVotePenalty: noVotePenaltyForStage(stage.penalty),
      redStarEligible: isRedStarEligibleStage(
        stage.sequenceOrder,
        redStarStartSequenceOrder,
      ),
    }));
  }),
});
