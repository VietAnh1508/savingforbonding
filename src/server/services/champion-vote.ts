import { CHAMPION_VOTE_BONUS } from "~/lib/match";
import { type PrismaClient } from "../../../generated/prisma";

/**
 * Settles every champion vote against the actual winner. Safe to call more than
 * once for the same winner — each vote's `points` records what was last applied,
 * so re-running only charges/refunds the delta rather than double-counting.
 */
export async function resolveChampionVotes(
  db: PrismaClient,
  winningCandidateId: string,
) {
  const votes = await db.championVote.findMany();

  let usersUpdated = 0;

  for (const vote of votes) {
    const isCorrect = vote.candidateId === winningCandidateId;
    const newPoints = isCorrect ? -CHAMPION_VOTE_BONUS : CHAMPION_VOTE_BONUS;
    const delta = newPoints - vote.points;

    if (delta !== 0) {
      const user = await db.user.findUnique({
        where: { id: vote.userId },
        select: { totalPoints: true, weeklyPoints: true },
      });
      if (user) {
        await db.user.update({
          where: { id: vote.userId },
          data: {
            totalPoints: Math.max(0, user.totalPoints + delta),
            weeklyPoints: Math.max(0, user.weeklyPoints + delta),
          },
        });
      }
      usersUpdated++;
    }

    await db.championVote.update({
      where: { id: vote.id },
      data: { isCorrect, points: newPoints },
    });
  }

  return { votesResolved: votes.length, usersUpdated };
}

export async function isChampionVotingOpen(db: PrismaClient): Promise<boolean> {
  const quarterFinalStage = await db.stage.findFirst({
    where: { name: "Quarter-final" },
  });
  if (!quarterFinalStage) return true;

  const firstQfMatch = await db.match.findFirst({
    where: { stageId: quarterFinalStage.id },
    orderBy: { kickoffAt: "asc" },
  });
  if (!firstQfMatch) return true;

  return new Date() < firstQfMatch.kickoffAt;
}
