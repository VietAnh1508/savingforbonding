import { type MatchStatus, type VoteOutcome } from "../../generated/prisma";

export type MatchVoteCounts = {
  home: number;
  draw: number;
  away: number;
};

export const VOTE_LOCK_MINUTES = 5;

/** Added to DB kickoff times for all user-facing display and voting lock. */
export const MATCH_KICKOFF_DISPLAY_OFFSET_HOURS = 0;

export function toDisplayKickoffAt(kickoffAt: Date): Date {
  return new Date(
    kickoffAt.getTime() +
      MATCH_KICKOFF_DISPLAY_OFFSET_HOURS * 60 * 60 * 1000,
  );
}

/** Platform fee — paid on every bet (win or lose). */
export const BEER_PLATFORM_FEE = 1;
/** Extra penalty on a losing bet, on top of the platform fee. */
export const BEER_LOSE_PENALTY = 2;
export const BEER_WIN = BEER_PLATFORM_FEE;
export const BEER_LOSE = BEER_PLATFORM_FEE + BEER_LOSE_PENALTY;
export const BEER_NO_BET = 2;

export function beerCostForVote(isCorrect: boolean): number {
  return isCorrect ? BEER_WIN : BEER_LOSE;
}

export function formatBeers(count: number): string {
  return `${count} beer${count === 1 ? "" : "s"}`;
}

export function validateBettingRatios(
  homeRatio: number,
  awayRatio: number,
): string | null {
  if (homeRatio < 0 || awayRatio < 0) {
    return "Ratios cannot be negative";
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
  const displayKickoff = toDisplayKickoffAt(kickoffAt);
  const lockTime = new Date(
    displayKickoff.getTime() - VOTE_LOCK_MINUTES * 60 * 1000,
  );
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

export function hasBettingHandicap(
  homeRatio: number,
  awayRatio: number,
): boolean {
  return homeRatio > 0 || awayRatio > 0;
}

export function adjustedScores(
  homeScore: number,
  awayScore: number,
  homeRatio: number,
  awayRatio: number,
): { home: number; away: number } {
  return {
    home: homeRatio > 0 ? homeScore - homeRatio : homeScore,
    away: awayRatio > 0 ? awayScore + awayRatio : awayScore,
  };
}

/** Settlement result after applying the match handicap (falls back to raw score if no ratio). */
export function deriveEffectiveResult(
  homeScore: number,
  awayScore: number,
  homeRatio: number,
  awayRatio: number,
): VoteOutcome {
  if (!hasBettingHandicap(homeRatio, awayRatio)) {
    return deriveResult(homeScore, awayScore);
  }

  const { home, away } = adjustedScores(
    homeScore,
    awayScore,
    homeRatio,
    awayRatio,
  );

  if (home > away) return "HOME_WIN";
  if (home < away) return "AWAY_WIN";
  return "DRAW";
}

export function isVoteCorrect(
  voteOutcome: VoteOutcome,
  homeScore: number,
  awayScore: number,
  homeRatio: number,
  awayRatio: number,
): boolean {
  return (
    voteOutcome ===
    deriveEffectiveResult(homeScore, awayScore, homeRatio, awayRatio)
  );
}

export function formatRatioValue(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

export function describeHandicapRule(
  homeCountry: string,
  awayCountry: string,
  homeRatio: number,
  awayRatio: number,
): string | null {
  if (!hasBettingHandicap(homeRatio, awayRatio)) {
    return null;
  }

  if (homeRatio > 0 && awayRatio > 0) {
    return `${homeCountry} -${formatRatioValue(homeRatio)} and ${awayCountry} +${formatRatioValue(awayRatio)} handicaps. Win or lose is decided after both lines are applied; (X) on a tie after handicap.`;
  }

  if (homeRatio > 0) {
    return `${homeCountry} -${formatRatioValue(homeRatio)} handicap. (1) wins only if home beats the line; (X) on a tie after handicap; (2) if away covers.`;
  }

  return `${awayCountry} +${formatRatioValue(awayRatio)} handicap. (2) wins unless home overcomes the line; (X) on a tie after handicap; (1) if home covers.`;
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

/** Vietnam time (UTC+7) for all match date/time display. */
export const MATCH_DISPLAY_TIMEZONE = "Asia/Ho_Chi_Minh";

const matchDateFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: MATCH_DISPLAY_TIMEZONE,
});

const matchTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: MATCH_DISPLAY_TIMEZONE,
  timeZoneName: "short",
});

const matchDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: MATCH_DISPLAY_TIMEZONE,
  timeZoneName: "short",
});

export function formatMatchDate(date: Date): string {
  return matchDateFormatter.format(toDisplayKickoffAt(date));
}

export function formatKickoffTime(date: Date): string {
  return matchTimeFormatter.format(toDisplayKickoffAt(date));
}

export function formatMatchDateTime(date: Date): string {
  return matchDateTimeFormatter.format(toDisplayKickoffAt(date));
}
