import { type PrismaClient } from "../../../generated/prisma";
import {
  beerCostForVote,
  deriveResult,
  isVoteCorrect,
  noBetPenaltyForStage,
} from "~/lib/match";

export async function resolveMatchVotes(
  db: PrismaClient,
  matchId: string,
  homeScore: number,
  awayScore: number,
) {
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) {
    throw new Error("Match not found");
  }

  const result = deriveResult(homeScore, awayScore);
  const alreadyResolved =
    match.status === "COMPLETED" && match.result !== null;

  if (alreadyResolved) {
    const unresolvedVotes = await db.vote.findMany({
      where: { matchId, isCorrect: null },
    });

    if (unresolvedVotes.length === 0) {
      return {
        result: match.result!,
        beersCharged: 0,
        noBetPenalties: 0,
        alreadyResolved: true,
      };
    }
  }

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
    const isCorrect = isVoteCorrect(
      vote.outcome,
      homeScore,
      awayScore,
      match.homeRatio,
      match.awayRatio,
    );
    const beers = beerCostForVote(isCorrect, match.stage);

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

  let noBetPenalties = 0;

  if (!alreadyResolved) {
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

    const noBetPenalty = noBetPenaltyForStage(match.stage);

    for (const user of nonVoters) {
      await db.user.update({
        where: { id: user.id },
        data: {
          totalPoints: { increment: noBetPenalty },
          weeklyPoints: { increment: noBetPenalty },
        },
      });
      beersCharged += noBetPenalty;
    }

    noBetPenalties = nonVoters.length;
  }

  return { result, beersCharged, noBetPenalties, alreadyResolved: false };
}
