import { type PrismaClient } from "../../../generated/prisma";

// Idempotent on re-entry — once a matchId's challenges have transitioned,
// no ACCEPTED or OPEN rows remain for it.
export async function resolveMatchChallenges(db: PrismaClient, matchId: string) {
  // Accepted challenges move to REVIEW so both participants can submit
  // their winner pick.
  await db.challenge.updateMany({
    where: { matchId, status: "ACCEPTED" },
    data: { status: "REVIEW" },
  });

  // Challenges nobody responded to before kickoff can never be accepted now —
  // abandon them instead of leaving them OPEN forever.
  await db.challenge.updateMany({
    where: { matchId, status: "OPEN" },
    data: { status: "ABANDONED" },
  });
}
