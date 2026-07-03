import { type PrismaClient } from "../../../generated/prisma";
import {
  beerCostForStarVote,
  beerCostForVote,
  deriveResult,
  isVoteCorrect,
  noVotePenaltyForStage,
} from "~/lib/match";

export async function resolveMatchVotes(
  db: PrismaClient,
  matchId: string,
  homeScore: number,
  awayScore: number,
) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { stage: { include: { penalty: true } } },
  });
  if (!match) {
    throw new Error("Match not found");
  }
  const stagePenalty = match.stage?.penalty;

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
        noVotePenalties: 0,
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
    const beers = vote.hasStar
      ? beerCostForStarVote(isCorrect, stagePenalty)
      : beerCostForVote(isCorrect, stagePenalty);

    await db.vote.update({
      where: { id: vote.id },
      data: { isCorrect, points: beers },
    });

    if (beers >= 0) {
      await db.user.update({
        where: { id: vote.userId },
        data: {
          totalPoints: { increment: beers },
          weeklyPoints: { increment: beers },
        },
      });
    } else {
      const user = await db.user.findUnique({
        where: { id: vote.userId },
        select: { totalPoints: true, weeklyPoints: true },
      });
      await db.user.update({
        where: { id: vote.userId },
        data: {
          totalPoints: Math.max(0, (user?.totalPoints ?? 0) + beers),
          weeklyPoints: Math.max(0, (user?.weeklyPoints ?? 0) + beers),
        },
      });
    }
    beersCharged += beers;
  }

  let noVotePenalties = 0;

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

    const noVotePenalty = noVotePenaltyForStage(stagePenalty);

    for (const user of nonVoters) {
      await db.user.update({
        where: { id: user.id },
        data: {
          totalPoints: { increment: noVotePenalty },
          weeklyPoints: { increment: noVotePenalty },
        },
      });
      beersCharged += noVotePenalty;
    }

    noVotePenalties = nonVoters.length;
  }

  return { result, beersCharged, noVotePenalties, alreadyResolved: false };
}
