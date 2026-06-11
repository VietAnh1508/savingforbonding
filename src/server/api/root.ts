import { adminRouter } from "~/server/api/routers/admin";
import { leaderboardRouter } from "~/server/api/routers/leaderboard";
import { matchRouter } from "~/server/api/routers/match";
import { voteRouter } from "~/server/api/routers/vote";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  match: matchRouter,
  vote: voteRouter,
  leaderboard: leaderboardRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
