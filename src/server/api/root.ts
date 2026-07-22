import { adminRouter } from "~/server/api/routers/admin";
import { beerAmountSpinRouter } from "~/server/api/routers/beer-amount-spin";
import { challengeRouter } from "~/server/api/routers/challenge";
import { championVoteRouter } from "~/server/api/routers/champion-vote";
import { leaderboardRouter } from "~/server/api/routers/leaderboard";
import { matchRouter } from "~/server/api/routers/match";
import { stageRouter } from "~/server/api/routers/stage";
import { topScorerVoteRouter } from "~/server/api/routers/top-scorer-vote";
import { userRouter } from "~/server/api/routers/user";
import { voteRouter } from "~/server/api/routers/vote";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  match: matchRouter,
  vote: voteRouter,
  leaderboard: leaderboardRouter,
  admin: adminRouter,
  user: userRouter,
  stage: stageRouter,
  championVote: championVoteRouter,
  topScorerVote: topScorerVoteRouter,
  beerAmountSpin: beerAmountSpinRouter,
  challenge: challengeRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
