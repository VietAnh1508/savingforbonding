import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { formatDateTime } from "~/lib/datetime";
import { CURRENT_TERMS_VERSION } from "~/lib/terms-content";
import { nameChangeAvailableAt } from "~/lib/user";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  getNameUpdatedAt: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { nameUpdatedAt: true },
    });
    return user.nameUpdatedAt;
  }),

  updateName: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Name is required").max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.session.user.id },
        select: { nameUpdatedAt: true },
      });

      const availableAt = nameChangeAvailableAt(current.nameUpdatedAt);
      if (availableAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can change your name again on ${formatDateTime(availableAt)}.`,
        });
      }

      const updated = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { name: input.name, nameUpdatedAt: new Date() },
        select: {
          id: true,
          name: true,
          email: true,
          nameUpdatedAt: true,
        },
      });

      return updated;
    }),

  acceptTerms: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        termsAcceptedAt: new Date(),
        termsAcceptedVersion: CURRENT_TERMS_VERSION,
      },
      select: { id: true, termsAcceptedAt: true, termsAcceptedVersion: true },
    });
  }),
});
