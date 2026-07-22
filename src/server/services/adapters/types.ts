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
