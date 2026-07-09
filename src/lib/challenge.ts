import { type Match } from "../../generated/prisma";

export function isChallengeableMatch(
  match: Pick<Match, "status" | "kickoffAt">,
): boolean {
  return match.status === "SCHEDULED" && match.kickoffAt.getTime() > Date.now();
}

export function maxStakeBeers(
  challengerPoints: number,
  opponentPoints: number,
): number {
  return Math.max(0, Math.min(challengerPoints, opponentPoints));
}

export function isParticipant(
  challenge: { challengerId: string; opponentId: string },
  userId: string,
): boolean {
  return challenge.challengerId === userId || challenge.opponentId === userId;
}

export function canRespond(
  challenge: { opponentId: string; status: string },
  userId: string,
): boolean {
  return challenge.opponentId === userId && challenge.status === "OPEN";
}

export function canCancel(
  challenge: { challengerId: string; status: string },
  userId: string,
): boolean {
  return challenge.challengerId === userId && challenge.status === "OPEN";
}

export function canSubmitPick(
  challenge: {
    challengerId: string;
    opponentId: string;
    status: string;
    challengerPickedWinnerId: string | null;
    opponentPickedWinnerId: string | null;
  },
  userId: string,
): boolean {
  if (!isParticipant(challenge, userId)) return false;
  // Conflict always needs a fresh pick from either side to resolve it, even
  // though both sides already have a (disagreeing) pick on file.
  if (challenge.status === "CONFLICT") return true;
  if (challenge.status !== "REVIEW") return false;
  // In REVIEW, only show the picker while the caller hasn't picked yet —
  // once they have, there's nothing left for them to do but wait.
  const myPick =
    challenge.challengerId === userId
      ? challenge.challengerPickedWinnerId
      : challenge.opponentPickedWinnerId;
  return myPick === null;
}

/** Beer delta applied to `userId` when a DONE challenge settled — null if not a participant or not yet settled. */
export function myChallengeDelta(
  challenge: {
    challengerId: string;
    opponentId: string;
    status: string;
    challengerPoints: number | null;
    opponentPoints: number | null;
  },
  userId: string,
): number | null {
  if (challenge.status !== "DONE") return null;
  if (challenge.challengerId === userId) return challenge.challengerPoints;
  if (challenge.opponentId === userId) return challenge.opponentPoints;
  return null;
}

/** Beer delta color convention: positive (more beer owed) = red, negative (less owed) = green. */
export function beerDeltaClasses(delta: number): string {
  if (delta > 0) return "text-red-700 dark:text-red-300";
  if (delta < 0) return "text-emerald-700 dark:text-emerald-300";
  return "";
}

export function formatBeerDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export const CHALLENGE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  REVIEW: "Review",
  CONFLICT: "Conflict",
  DONE: "Done",
};

export const CHALLENGE_STATUS_BADGE_CLASSES: Record<string, string> = {
  OPEN: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  ACCEPTED: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-foreground/10 text-foreground/50",
  CANCELLED: "bg-foreground/10 text-foreground/50",
  REVIEW: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  CONFLICT: "bg-red-500/20 text-red-700 dark:text-red-300",
  DONE: "bg-green-500/20 text-green-700 dark:text-green-300",
};
