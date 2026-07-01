import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const stageRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.stage.findMany({
      orderBy: { sequenceOrder: "asc" },
      select: { id: true, name: true, sequenceOrder: true, isKnockout: true },
    });
  }),

  listKnockout: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.stage.findMany({
      where: { isKnockout: true },
      orderBy: { sequenceOrder: "asc" },
      select: { id: true, name: true, sequenceOrder: true },
    });
  }),
});
