import { type MatchStatus, type VoteOutcome } from "../../generated/prisma";

export const VOTE_LOCK_MINUTES = 5;
export const CORRECT_PREDICTION_POINTS = 10;

export function validateBettingRatios(
  homeRatio: number,
  awayRatio: number,
): string | null {
  if (homeRatio < 0 || awayRatio < 0) {
    return "Ratios cannot be negative";
  }
  const homeSet = homeRatio > 0;
  const awaySet = awayRatio > 0;
  if (homeSet && awaySet) {
    return "Only one side can have a ratio — set the other to 0";
  }
  if (!homeSet && !awaySet) {
    return "One side must have a ratio greater than 0";
  }
  if (homeSet && awayRatio !== 0) {
    return "When home has a ratio, away must be 0";
  }
  if (awaySet && homeRatio !== 0) {
    return "When away has a ratio, home must be 0";
  }
  return null;
}

export function isVotingOpen(
  kickoffAt: Date,
  status: MatchStatus,
): boolean {
  if (status === "COMPLETED" || status === "CANCELLED" || status === "LIVE") {
    return false;
  }
  const lockTime = new Date(kickoffAt.getTime() - VOTE_LOCK_MINUTES * 60 * 1000);
  return new Date() < lockTime;
}

export function isMatchEditable(status: MatchStatus): boolean {
  return status !== "COMPLETED" && status !== "CANCELLED";
}

export function deriveResult(
  homeScore: number,
  awayScore: number,
): VoteOutcome {
  if (homeScore > awayScore) return "HOME_WIN";
  if (homeScore < awayScore) return "AWAY_WIN";
  return "DRAW";
}

export function outcomeLabel(outcome: VoteOutcome): string {
  switch (outcome) {
    case "HOME_WIN":
      return "Home Win (1)";
    case "DRAW":
      return "Draw (X)";
    case "AWAY_WIN":
      return "Away Win (2)";
  }
}

export function outcomeShort(outcome: VoteOutcome): string {
  switch (outcome) {
    case "HOME_WIN":
      return "1";
    case "DRAW":
      return "X";
    case "AWAY_WIN":
      return "2";
  }
}

export function formatMatchDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatKickoffTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
