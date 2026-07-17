import { z } from "zod";

import { type MatchStatus, type VoteOutcome } from "../../generated/prisma";

export type MatchVoteCounts = {
  home: number;
  draw: number;
  away: number;
};

export type MatchVoter = {
  id: string;
  name: string | null;
  starMultiplier: number | null;
  isAllIn: boolean;
};

export const VOTE_LOCK_MINUTES = 5;

/** Platform fee — paid on every prediction (win or lose). */
export const BEER_PLATFORM_FEE = 1;
/** Extra penalty on a wrong prediction, on top of the platform fee. */
export const BEER_LOSE_PENALTY = 2;
export const BEER_WIN = BEER_PLATFORM_FEE;
export const BEER_LOSE = BEER_PLATFORM_FEE + BEER_LOSE_PENALTY;
export const BEER_NO_VOTE = 2;
/** Beer swing for a champion pick: correct picks subtract this many, wrong picks add it. */
export const CHAMPION_VOTE_BONUS = 50;
/** Beer swing for a top scorer pick — its own constant so it can be tuned independently of the champion bonus. */
export const TOP_SCORER_VOTE_BONUS = 50;

/** Minimum (and default) multiplier a player can pick when placing a star. */
export const MIN_STAR_MULTIPLIER = 2;
/** Fixed star tiers, each doubling the last — mirrors the old Yellow/Red/Purple/Black scheme. */
export const STAR_TIER_MULTIPLIERS = [2, 4, 8, 16] as const;

/** Whether a stage allows placing a star at all (0/unset means disabled). */
export function isStarEligibleStage(
  maxStarMultiplier: number | null | undefined,
): boolean {
  return (maxStarMultiplier ?? 0) >= MIN_STAR_MULTIPLIER;
}

export function isValidStarMultiplier(n: number): boolean {
  return (STAR_TIER_MULTIPLIERS as readonly number[]).includes(n);
}

/** Validates a star multiplier input: `null` (no star) or one of the fixed tiers. */
export const starMultiplierSchema = z.union([
  z.number().refine(isValidStarMultiplier, {
    message: `Multiplier must be one of ×${STAR_TIER_MULTIPLIERS.join(", ×")}`,
  }),
  z.null(),
]);

/** Bounds `multiplier` to the stage's tier ceiling. Returns `null` if `maxStarMultiplier` disables stars for the stage. */
export function clampStarMultiplier(
  multiplier: number,
  maxStarMultiplier: number,
): number | null {
  if (!isStarEligibleStage(maxStarMultiplier)) return null;
  return Math.min(multiplier, maxStarMultiplier);
}

export function validateMaxStarMultiplier(n: number): string | null {
  const isDisabled = n === 0;
  const isValidTier = (STAR_TIER_MULTIPLIERS as readonly number[]).includes(n);
  if (!Number.isInteger(n) || (!isDisabled && !isValidTier)) {
    return `Max multiplier must be 0 (disabled) or one of ×${STAR_TIER_MULTIPLIERS.join(", ×")}`;
  }
  return null;
}

function beerCostForBonusVote(
  isCorrect: boolean,
  starMultiplier: number | null,
  bonus: number,
): number {
  const swing = bonus * (starMultiplier ?? 1);
  return isCorrect ? -swing : swing;
}

export function beerCostForChampionVote(
  isCorrect: boolean,
  starMultiplier: number | null,
): number {
  return beerCostForBonusVote(isCorrect, starMultiplier, CHAMPION_VOTE_BONUS);
}

export function beerCostForTopScorerVote(
  isCorrect: boolean,
  starMultiplier: number | null,
): number {
  return beerCostForBonusVote(isCorrect, starMultiplier, TOP_SCORER_VOTE_BONUS);
}

export function beerCostForStarVote(
  isCorrect: boolean,
  penalty: StagePenaltyValues,
  starMultiplier: number | null,
): number {
  const multiplied = wrongPenaltyForStage(penalty) * (starMultiplier ?? 1);
  return isCorrect ? -multiplied : multiplied;
}

export type StagePenaltyValues =
  | { wrongPenalty: number; noVotePenalty: number }
  | null
  | undefined;

export function wrongPenaltyForStage(penalty: StagePenaltyValues): number {
  return penalty?.wrongPenalty ?? BEER_LOSE;
}

export function noVotePenaltyForStage(penalty: StagePenaltyValues): number {
  return penalty?.noVotePenalty ?? BEER_NO_VOTE;
}

export function beerCostForVote(
  isCorrect: boolean,
  penalty: StagePenaltyValues,
): number {
  return isCorrect ? BEER_WIN : wrongPenaltyForStage(penalty);
}

/** All-in resolution: a correct pick clears the counter to 0; a wrong pick doubles it. */
export function allInResolvedPoints(isCorrect: boolean, current: number): number {
  return isCorrect ? 0 : current * 2;
}

export function validateStagePenalty(
  wrongPenalty: number,
  noVotePenalty: number,
): string | null {
  if (
    !Number.isInteger(wrongPenalty) ||
    !Number.isInteger(noVotePenalty) ||
    wrongPenalty < 0 ||
    noVotePenalty < 0
  ) {
    return "Penalties must be non-negative whole numbers";
  }
  return null;
}

export function validateStageStars(starsAllocated: number): string | null {
  if (!Number.isInteger(starsAllocated) || starsAllocated < 0) {
    return "Stars must be a non-negative whole number";
  }
  return null;
}

export function formatBeers(count: number): string {
  return `${count} beer${count === 1 ? "" : "s"}`;
}

export function validateVotingRatios(
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

export function hasVotingHandicap(
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
  if (!hasVotingHandicap(homeRatio, awayRatio)) {
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
  if (!hasVotingHandicap(homeRatio, awayRatio)) {
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

/** Format a UTC Date as an ISO string in Vietnam time (UTC+7), sliced to `length` chars. */
export function toVNDate(date: Date, length = 10): string {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, length);
}

/** Parse a `datetime-local` input value entered as Vietnam time (UTC+7) into a UTC Date. */
export function fromVietnamDatetimeLocal(value: string): Date {
  return new Date(`${value}:00+07:00`);
}

/** UTC instant range `[start, end)` covering "today" and "tomorrow" in Vietnam time. */
export function vnTodayTomorrowRangeUTC(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  const vnMidnightUTC = Date.UTC(
    vnNow.getUTCFullYear(),
    vnNow.getUTCMonth(),
    vnNow.getUTCDate(),
  );
  const start = new Date(vnMidnightUTC - VN_OFFSET_MS);
  const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000);
  return { start, end };
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

export function voterLabel(count: number): string {
  return `${count} voter${count === 1 ? "" : "s"}`;
}
