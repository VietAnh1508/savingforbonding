import { beerCostForChampionVote } from "~/lib/match";
import { type PrismaClient } from "../../../generated/prisma";

/**
 * Settles every champion vote against the actual winner. Safe to call more than
 * once for the same winner — each vote's `points` records what was last applied,
 * so re-running only charges/refunds the delta rather than double-counting. A
 * vote with no active pick is treated like a wrong pick with zero stakes: not
 * correct, no beer swing.
 */
export async function resolveChampionVotes(
  db: PrismaClient,
  winningCandidateId: string,
) {
  const votes = await db.championVote.findMany();

  let usersUpdated = 0;

  for (const vote of votes) {
    const isCorrect = vote.candidateId === winningCandidateId;
    const newPoints = vote.candidateId
      ? beerCostForChampionVote(isCorrect, vote.starTier)
      : 0;
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

/**
 * Marks a champion candidate eliminated and clears the pick (and star) of
 * everyone currently backing them, so they can re-pick from the survivors.
 * No beer swing happens here — elimination is a free re-pick; only the
 * Final's outcome settles anyone's tab, via `resolveChampionVotes`.
 *
 * The `updateMany` claim (rather than a plain `update`) is an atomic
 * compare-and-swap: it only affects the row if `eliminatedAt` is still null,
 * so two overlapping calls for the same candidate (e.g. the daily cron and a
 * manual admin sync landing at the same time) can't both proceed — the loser
 * sees `count === 0` and bails out as a no-op.
 */
export async function eliminateChampionCandidate(
  db: PrismaClient,
  candidateId: string,
) {
  const claim = await db.championCandidate.updateMany({
    where: { id: candidateId, eliminatedAt: null },
    data: { eliminatedAt: new Date() },
  });
  if (claim.count === 0) {
    return { usersAffected: 0 };
  }

  const cleared = await db.championVote.updateMany({
    where: { candidateId },
    data: { candidateId: null, starTier: null },
  });

  return { usersAffected: cleared.count };
}

/** Kickoff of the Semi-final stage, or null if it isn't scheduled yet. */
export async function getChampionVotingDeadline(
  db: PrismaClient,
): Promise<Date | null> {
  const semiFinalStage = await db.stage.findFirst({
    where: { name: "Semi-final" },
    select: { startDate: true },
  });
  return semiFinalStage?.startDate ?? null;
}

export async function isChampionVotingOpen(db: PrismaClient): Promise<boolean> {
  const deadline = await getChampionVotingDeadline(db);
  return !deadline || new Date() < deadline;
}
