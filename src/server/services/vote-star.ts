import { type PrismaClient } from "../../../generated/prisma";

/** Sequence order of the stage from which red star becomes eligible, or null if none is configured. */
export async function getRedStarStartSequenceOrder(
  db: PrismaClient,
): Promise<number | null> {
  const startStage = await db.stage.findFirst({
    where: { isRedStarStartStage: true },
    select: { sequenceOrder: true },
  });
  return startStage?.sequenceOrder ?? null;
}
