import { type MatchStatus } from "../../../../generated/prisma";

/**
 * Only "topScorer" for now — champion candidates are still 100% FIFA-sourced
 * (no third-party API to decouple from), so they don't need an adapter yet.
 * Extend this union if/when champion candidates get their own source.
 */
export type AwardKey = "topScorer";

/** Source-agnostic candidate shape — field names mirror `TopScorerCandidate`. */
export type NormalizedAwardCandidate = {
  externalId: string;
  name: string;
  countryName: string;
  /** FIFA 3-letter code resolved from `countryName`, or null if unrecognized. */
  countryCode: string | null;
  /** Per-team crest/logo image URL, or null if the source doesn't provide one. */
  logoUrl: string | null;
  goals: number;
  assists: number;
  minutesPlayed: number;
};

export interface AwardSourceAdapter {
  /** All candidates for `awardKey`, sorted best-to-worst per the source's own ranking rules. */
  fetchCandidates(awardKey: AwardKey): Promise<NormalizedAwardCandidate[]>;
}

/** Source-agnostic stage/round shape — field names mirror the `Stage` model. */
export type NormalizedStage = {
  externalId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  sequenceOrder: number;
  isKnockout: boolean;
};

/** Source-agnostic qualified-team shape, used for candidate eligibility (champion/top-scorer). */
export type NormalizedTeam = {
  externalId: string;
  name: string;
  countryCode: string;
};

/**
 * Source-agnostic fixture shape — not a 1:1 mirror of the `Match` model (e.g.
 * `homeName`/`awayName` vs. `homeCountry`/`awayCountry`, deliberately: a club
 * tournament's sides aren't countries). See `sync-fifa-fixtures.ts` for the
 * mapping onto `Match` columns.
 */
export type NormalizedMatch = {
  externalId: string;
  stageExternalId: string;
  status: MatchStatus;
  homeName: string;
  awayName: string;
  /** Null for a bracket slot that hasn't resolved yet (placeholder team). */
  homeCountryCode: string | null;
  awayCountryCode: string | null;
  kickoffAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  /** The source's own team id for the match winner (incl. ET/pens); null if undecided. */
  winnerExternalTeamId: string | null;
};

export interface FixtureSourceAdapter {
  fetchStages(): Promise<NormalizedStage[]>;
  fetchFixtures(): Promise<NormalizedMatch[]>;
  fetchQualifiedTeams(stageExternalId: string): Promise<NormalizedTeam[]>;
}
