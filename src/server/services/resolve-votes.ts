import { type PrismaClient } from "../../../generated/prisma";
import { CORRECT_PREDICTION_POINTS, deriveResult } from "~/lib/match";

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

  let pointsAwarded = 0;

  for (const vote of unresolvedVotes) {
    const isCorrect = vote.outcome === result;
    const points = isCorrect ? CORRECT_PREDICTION_POINTS : 0;

    await db.vote.update({
      where: { id: vote.id },
      data: { isCorrect, points },
    });

    if (isCorrect) {
      await db.user.update({
        where: { id: vote.userId },
        data: {
          totalPoints: { increment: points },
          weeklyPoints: { increment: points },
        },
      });
      pointsAwarded += points;
    }
  }

  return { result, pointsAwarded };
}
