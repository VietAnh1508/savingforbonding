import {
  type PrismaClient,
  type VoteOutcome,
} from "../../../generated/prisma";

import { type MatchVoteCounts } from "~/lib/match";

export type { MatchVoteCounts };

export function emptyMatchVoteCounts(): MatchVoteCounts {
  return { home: 0, draw: 0, away: 0 };
}

function applyOutcomeCount(
  counts: MatchVoteCounts,
  outcome: VoteOutcome,
  total: number,
) {
  if (outcome === "HOME_WIN") counts.home = total;
  else if (outcome === "DRAW") counts.draw = total;
  else if (outcome === "AWAY_WIN") counts.away = total;
}

export async function getVoteCountsByMatchId(
  db: PrismaClient,
  matchIds: string[],
): Promise<Map<string, MatchVoteCounts>> {
  const counts = new Map<string, MatchVoteCounts>();

  for (const id of matchIds) {
    counts.set(id, emptyMatchVoteCounts());
  }

  if (matchIds.length === 0) return counts;

  const grouped = await db.vote.groupBy({
    by: ["matchId", "outcome"],
    where: { matchId: { in: matchIds } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const entry = counts.get(row.matchId);
    if (!entry) continue;
    applyOutcomeCount(entry, row.outcome, row._count._all);
  }

  return counts;
}
