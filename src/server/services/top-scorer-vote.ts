import { beerCostForTopScorerVote } from "~/lib/match";
import { applyPointsDelta } from "~/server/services/points";
import { type PrismaClient } from "../../../generated/prisma";

/**
 * Settles every top scorer vote against the actual Golden Boot winner(s).
 * Accepts multiple winning candidate ids to handle a goals tie. Safe to call
 * more than once for the same winner set — each vote's `points` records what
 * was last applied, so re-running only charges/refunds the delta rather than
 * double-counting. A vote with no active pick is treated like a wrong pick
 * with zero stakes: not correct, no beer swing.
 */
export async function resolveTopScorerVotes(
  db: PrismaClient,
  winningCandidateIds: string[],
  tournamentId: string,
) {
  const votes = await db.topScorerVote.findMany({ where: { tournamentId } });

  let usersUpdated = 0;

  for (const vote of votes) {
    const isCorrect =
      !!vote.candidateId && winningCandidateIds.includes(vote.candidateId);
    const newPoints = vote.candidateId
      ? beerCostForTopScorerVote(isCorrect, vote.starMultiplier)
      : 0;
    const delta = newPoints - vote.points;

    if (delta !== 0) {
      await applyPointsDelta(db, vote.userId, delta);
      usersUpdated++;
    }

    await db.topScorerVote.update({
      where: { id: vote.id },
      data: { isCorrect, points: newPoints },
    });
  }

  return { votesResolved: votes.length, usersUpdated };
}

/** Top scorer vote has no stage, so its max multiplier lives in GameSettings, one row per tournament. */
export async function getTopScorerMaxStarMultiplier(
  db: PrismaClient,
  tournamentId: string,
): Promise<number> {
  const settings = await db.gameSettings.findUnique({ where: { tournamentId } });
  return settings?.topScorerMaxStarMultiplier ?? 4;
}

/** Kickoff of the Play-off for third place stage, or null if it isn't scheduled yet. */
export async function getTopScorerVotingDeadline(
  db: PrismaClient,
  tournamentId: string,
): Promise<Date | null> {
  const thirdPlaceStage = await db.stage.findFirst({
    where: { name: "Play-off for third place", tournamentId },
    select: { startDate: true },
  });
  return thirdPlaceStage?.startDate ?? null;
}

export async function isTopScorerVotingOpen(
  db: PrismaClient,
  tournamentId: string,
): Promise<boolean> {
  const deadline = await getTopScorerVotingDeadline(db, tournamentId);
  return !deadline || new Date() < deadline;
}
