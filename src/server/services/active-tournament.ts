import { type PrismaClient, type Tournament } from "../../../generated/prisma";

/**
 * Per Decision 1 in docs/MULTI_TOURNAMENT_PLATFORM_PLAN.md, exactly one tournament is
 * ACTIVE at a time — this is the seam Phase 4's real cookie/selector-backed lookup
 * will replace.
 */
export async function getActiveTournament(db: PrismaClient): Promise<Tournament> {
  return db.tournament.findFirstOrThrow({
    where: { status: "ACTIVE" },
  });
}

export async function getActiveTournamentId(db: PrismaClient): Promise<string> {
  const tournament = await getActiveTournament(db);
  return tournament.id;
}
