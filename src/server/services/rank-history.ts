import { toVNDate } from "~/lib/datetime";
import { noVotePenaltyForStage } from "~/lib/match";
import { computeRankHistory } from "~/lib/rank-history";
import { type PrismaClient } from "../../../generated/prisma";

// Shared by beerByDay/rankByDay (leaderboard.ts) and repairBeerTotals (admin.ts)
// — all three need the same per-day, per-user beer history (completed matches
// + resolved votes + champion/top-scorer bonus bucketed onto the Final's day);
// they just consume it differently.
export async function computeCurrentRankHistory(db: PrismaClient) {
  const [completedMatches, resolvedVotes, allUsers, championVotes, topScorerVotes] =
    await Promise.all([
      db.match.findMany({
        where: { status: "COMPLETED" },
        select: {
          id: true,
          kickoffAt: true,
          stage: { select: { penalty: true, name: true } },
        },
        orderBy: { kickoffAt: "asc" },
      }),
      db.vote.findMany({
        where: { match: { status: "COMPLETED" } },
        select: {
          userId: true,
          matchId: true,
          points: true,
          isCorrect: true,
          isAllIn: true,
        },
      }),
      db.user.findMany({ select: { id: true, name: true, image: true } }),
      db.championVote.findMany({
        where: { isCorrect: { not: null }, candidateId: { not: null } },
        select: { userId: true, points: true },
      }),
      db.topScorerVote.findMany({
        where: { isCorrect: { not: null }, candidateId: { not: null } },
        select: { userId: true, points: true },
      }),
    ]);

  const matchInputs = completedMatches.map((match) => ({
    id: match.id,
    kickoffAt: match.kickoffAt,
    noVotePenalty: noVotePenaltyForStage(match.stage?.penalty),
  }));

  // Champion/top-scorer votes settle once, tied to the Final's completion
  // (see resolveChampionIfFinal/resolveTopScorerIfFinal) — bucket them onto
  // that match's day rather than whichever day the sync happened to run.
  const finalMatch = completedMatches.find((match) => match.stage?.name === "Final");
  const bonus =
    finalMatch && (championVotes.length > 0 || topScorerVotes.length > 0)
      ? { date: toVNDate(finalMatch.kickoffAt), championVotes, topScorerVotes }
      : undefined;

  return computeRankHistory(matchInputs, resolvedVotes, allUsers, bonus);
}
