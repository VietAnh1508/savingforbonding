import { type PrismaClient } from "../../../generated/prisma";

/** Sequence order of the Semi-final stage, or null if it isn't scheduled yet. */
export async function getSemiFinalSequenceOrder(
  db: PrismaClient,
): Promise<number | null> {
  const semiFinalStage = await db.stage.findFirst({
    where: { name: "Semi-final" },
    select: { sequenceOrder: true },
  });
  return semiFinalStage?.sequenceOrder ?? null;
}
