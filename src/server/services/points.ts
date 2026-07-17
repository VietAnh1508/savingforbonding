import { type PrismaClient } from "../../../generated/prisma";

/** Applies a points delta to a user's total/weekly points, clamped at 0. No-op if the user is missing. */
export async function applyPointsDelta(
  db: PrismaClient,
  userId: string,
  delta: number,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totalPoints: true, weeklyPoints: true },
  });
  if (!user) return;

  await db.user.update({
    where: { id: userId },
    data: {
      totalPoints: Math.max(0, user.totalPoints + delta),
      weeklyPoints: Math.max(0, user.weeklyPoints + delta),
    },
  });
}
