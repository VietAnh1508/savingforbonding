import { type MatchStatus, type VoteOutcome } from "../../generated/prisma";

export type MatchVoteCounts = {
  home: number;
  draw: number;
  away: number;
};

export type MatchVoter = { id: string; name: string | null; hasStar: boolean };

export const VOTE_LOCK_MINUTES = 5;

/** Platform fee — paid on every prediction (win or lose). */
export const BEER_PLATFORM_FEE = 1;
/** Extra penalty on a wrong prediction, on top of the platform fee. */
export const BEER_LOSE_PENALTY = 2;
export const BEER_WIN = BEER_PLATFORM_FEE;
export const BEER_LOSE = BEER_PLATFORM_FEE + BEER_LOSE_PENALTY;
export const BEER_NO_BET = 2;

export const STARS_BY_STAGE: Record<string, number> = {
  "Round of 32": 8,
  "Round of 16": 4,
  "Quarter-final": 2,
  "Semi-final": 1,
  "Play-off for third place": 1,
  "Final": 1,
};

export function starsAllocatedForStage(stage: string | null): number {
  return (stage !== null ? (STARS_BY_STAGE[stage] ?? 0) : 0);
}

export function beerCostForStarVote(isCorrect: boolean, stage: string | null): number {
  const doubled = wrongPenaltyForStage(stage) * 2;
  return isCorrect ? -doubled : doubled;
}

export const KNOCKOUT_STAGE_ORDER = [
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Play-off for third place",
  "Final",
] as const;

export function wrongPenaltyForStage(stage: string | null): number {
  const index = KNOCKOUT_STAGE_ORDER.indexOf(
    stage as (typeof KNOCKOUT_STAGE_ORDER)[number],
  );
  return index === -1 ? BEER_LOSE : BEER_LOSE + (index + 1) * 3;
}

export function noBetPenaltyForStage(stage: string | null): number {
  const isKnockout =
    KNOCKOUT_STAGE_ORDER.indexOf(stage as (typeof KNOCKOUT_STAGE_ORDER)[number]) !== -1;
  return isKnockout ? wrongPenaltyForStage(stage) + 2 : BEER_NO_BET;
}

export function beerCostForVote(isCorrect: boolean, stage: string | null): number {
  return isCorrect ? BEER_WIN : wrongPenaltyForStage(stage);
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

export function isVotingOpen(kickoffAt: Date, status: MatchStatus): boolean {
  if (status === "COMPLETED" || status === "CANCELLED" || status === "LIVE") {
    return false;
  }
  const lockTime = new Date(
    kickoffAt.getTime() - VOTE_LOCK_MINUTES * 60 * 1000,
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
    away: awayRatio > 0 ? awayScore - awayRatio : awayScore,
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

  return `${awayCountry} -${formatRatioValue(awayRatio)} handicap. (2) wins only if away beats the line; (X) on a tie after handicap; (1) if home covers.`;
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

export function outcomeLabel(
  outcome: VoteOutcome,
  homeCountry: string,
  awayCountry: string,
): string {
  switch (outcome) {
    case "HOME_WIN":
      return homeCountry;
    case "DRAW":
      return "Draw";
    case "AWAY_WIN":
      return awayCountry;
  }
}

/** Vietnam time (UTC+7) for all match date/time display. */
export const MATCH_DISPLAY_TIMEZONE = "Asia/Ho_Chi_Minh";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Format a UTC Date as a `datetime-local` input value in Vietnam time (UTC+7). */
export function toVietnamDatetimeLocal(date: Date): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 16);
}

/** Parse a `datetime-local` input value entered as Vietnam time (UTC+7) into a UTC Date. */
export function fromVietnamDatetimeLocal(value: string): Date {
  return new Date(`${value}:00+07:00`);
}

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
});

const matchDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: MATCH_DISPLAY_TIMEZONE,
});

const joiningDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: MATCH_DISPLAY_TIMEZONE,
});

export function formatMatchDate(date: Date): string {
  return matchDateFormatter.format(date);
}

export function formatKickoffTime(date: Date): string {
  return matchTimeFormatter.format(date);
}

export function formatMatchDateTime(date: Date): string {
  return matchDateTimeFormatter.format(date);
}

export function formatJoiningDate(date: Date): string {
  return joiningDateFormatter.format(date);
}

