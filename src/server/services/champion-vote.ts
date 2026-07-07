import { type PrismaClient } from "../../../generated/prisma";

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
