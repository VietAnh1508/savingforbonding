import { type PrismaClient } from "../../../generated/prisma";
import {
  BEER_NO_BET,
  beerCostForVote,
  deriveResult,
} from "~/lib/match";

export async function resolveMatchVotes(
  db: PrismaClient,
  matchId: string,
  homeScore: number,
  awayScore: number,
) {
  const result = deriveResult(homeScore, awayScore);

  await db.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      result,
      status: "COMPLETED",
    },
  });

  const unresolvedVotes = await db.vote.findMany({
    where: { matchId, isCorrect: null },
  });

  let beersCharged = 0;

  for (const vote of unresolvedVotes) {
    const isCorrect = vote.outcome === result;
    const beers = beerCostForVote(isCorrect);

    await db.vote.update({
      where: { id: vote.id },
      data: { isCorrect, points: beers },
    });

    await db.user.update({
      where: { id: vote.userId },
      data: {
        totalPoints: { increment: beers },
        weeklyPoints: { increment: beers },
      },
    });
    beersCharged += beers;
  }

  const votedUserIds = new Set(
    (
      await db.vote.findMany({
        where: { matchId },
        select: { userId: true },
      })
    ).map((v) => v.userId),
  );

  const nonVoters = await db.user.findMany({
    where: { id: { notIn: [...votedUserIds] } },
    select: { id: true },
  });

  for (const user of nonVoters) {
    await db.user.update({
      where: { id: user.id },
      data: {
        totalPoints: { increment: BEER_NO_BET },
        weeklyPoints: { increment: BEER_NO_BET },
      },
    });
    beersCharged += BEER_NO_BET;
  }

  return { result, beersCharged, noBetPenalties: nonVoters.length };
}
