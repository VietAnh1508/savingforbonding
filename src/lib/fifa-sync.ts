import { type MatchStatus, type VoteOutcome } from "../../generated/prisma";

const PLACEHOLDER_PATTERNS = [
  /^tbd$/i,
  /^[12][A-L]$/i,
  /^winner\b/i,
  /^runner-?up\b/i,
  /third place/i,
  /group [A-L]/i,
  /^match \d+/i,
];

export function isPlaceholderTeam(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Prefer FIFA real team names; keep admin labels until FIFA confirms a side. */
export function mergeTeamName(existing: string, fifaName: string): string {
  if (fifaName === "TBD") return existing;
  if (!isPlaceholderTeam(fifaName)) return fifaName;
  if (!isPlaceholderTeam(existing)) return existing;
  return fifaName;
}

const STATUS_RANK: Record<MatchStatus, number> = {
  SCHEDULED: 0,
  POSTPONED: 0,
  LIVE: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

/** Never downgrade terminal or in-progress match states. */
export function mergeMatchStatus(
  existing: MatchStatus,
  fifa: MatchStatus,
): MatchStatus {
  if (existing === "COMPLETED" || existing === "CANCELLED") return existing;
  if (existing === "LIVE" && fifa === "SCHEDULED") return "LIVE";
  if (STATUS_RANK[fifa] >= STATUS_RANK[existing]) return fifa;
  return existing;
}

export function mergeScores(
  existingHome: number | null,
  existingAway: number | null,
  fifaHome: number | null,
  fifaAway: number | null,
  status: MatchStatus,
): { homeScore: number | null; awayScore: number | null } {
  if (status === "COMPLETED") {
    return {
      homeScore: fifaHome ?? existingHome,
      awayScore: fifaAway ?? existingAway,
    };
  }

  if (fifaHome !== null && fifaAway !== null) {
    return { homeScore: fifaHome, awayScore: fifaAway };
  }

  return { homeScore: existingHome, awayScore: existingAway };
}

export function deriveResultIfComplete(
  status: MatchStatus,
  homeScore: number | null,
  awayScore: number | null,
  deriveResult: (home: number, away: number) => VoteOutcome,
): VoteOutcome | null {
  if (status !== "COMPLETED" || homeScore === null || awayScore === null) {
    return null;
  }
  return deriveResult(homeScore, awayScore);
}

/**
 * FIFA is the only source of the code, so just take it when present; never
 * overwrite a known code with an absence (e.g. a transient placeholder read).
 */
export function mergeCountryCode(
  existing: string | null,
  fifa: string | null,
): string | null {
  return fifa ?? existing;
}

export type FifaMatchPatch = {
  homeCountry: string;
  awayCountry: string;
  homeCountryCode: string | null;
  awayCountryCode: string | null;
  kickoffAt: Date;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  result: VoteOutcome | null;
  stageId: string | null;
};

export function buildFifaMatchPatch(
  existing: {
    homeCountry: string;
    awayCountry: string;
    homeCountryCode: string | null;
    awayCountryCode: string | null;
    kickoffAt: Date;
    status: MatchStatus;
    homeScore: number | null;
    awayScore: number | null;
    homePenaltyScore: number | null;
    awayPenaltyScore: number | null;
    result: VoteOutcome | null;
    stageId: string | null;
  },
  fifa: {
    homeCountry: string;
    awayCountry: string;
    homeCountryCode: string | null;
    awayCountryCode: string | null;
    kickoffAt: Date;
    status: MatchStatus;
    homeScore: number | null;
    awayScore: number | null;
    homePenaltyScore: number | null;
    awayPenaltyScore: number | null;
    stageId: string | null;
  },
  deriveResult: (home: number, away: number) => VoteOutcome,
): { patch: FifaMatchPatch; teamsUpdated: boolean; changed: boolean } {
  const homeCountry = mergeTeamName(existing.homeCountry, fifa.homeCountry);
  const awayCountry = mergeTeamName(existing.awayCountry, fifa.awayCountry);
  const homeCountryCode = mergeCountryCode(
    existing.homeCountryCode,
    fifa.homeCountryCode,
  );
  const awayCountryCode = mergeCountryCode(
    existing.awayCountryCode,
    fifa.awayCountryCode,
  );
  const status = mergeMatchStatus(existing.status, fifa.status);
  const { homeScore, awayScore } = mergeScores(
    existing.homeScore,
    existing.awayScore,
    fifa.homeScore,
    fifa.awayScore,
    status,
  );
  const result = deriveResultIfComplete(
    status,
    homeScore,
    awayScore,
    deriveResult,
  );

  const kickoffAt =
    existing.status === "COMPLETED" ? existing.kickoffAt : fifa.kickoffAt;

  const patch: FifaMatchPatch = {
    homeCountry,
    awayCountry,
    homeCountryCode,
    awayCountryCode,
    kickoffAt,
    status,
    homeScore,
    awayScore,
    homePenaltyScore: fifa.homePenaltyScore,
    awayPenaltyScore: fifa.awayPenaltyScore,
    result,
    stageId: fifa.stageId,
  };

  const teamsUpdated =
    homeCountry !== existing.homeCountry ||
    awayCountry !== existing.awayCountry;

  const changed =
    teamsUpdated ||
    patch.homeCountryCode !== existing.homeCountryCode ||
    patch.awayCountryCode !== existing.awayCountryCode ||
    patch.kickoffAt.getTime() !== existing.kickoffAt.getTime() ||
    patch.status !== existing.status ||
    patch.homeScore !== existing.homeScore ||
    patch.awayScore !== existing.awayScore ||
    patch.result !== existing.result ||
    patch.stageId !== existing.stageId ||
    patch.homePenaltyScore !== existing.homePenaltyScore ||
    patch.awayPenaltyScore !== existing.awayPenaltyScore;

  return { patch, teamsUpdated, changed };
}
