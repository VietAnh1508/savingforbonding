import { getFifaCountryCode } from "~/lib/country-flag";
import {
  compareGoldenBoot,
  fetchTopScorers,
  type VnexpressTopScorer,
} from "~/server/services/vnexpress-api";
import {
  type AwardKey,
  type AwardSourceAdapter,
  type NormalizedAwardCandidate,
} from "./types";

function toNormalizedCandidate(
  scorer: VnexpressTopScorer,
): NormalizedAwardCandidate {
  return {
    externalId: String(scorer.player_id),
    name: scorer.player_name,
    countryName: scorer.nationality,
    countryCode: getFifaCountryCode(scorer.nationality),
    goals: scorer.goals.total,
    assists: scorer.goals.assists ?? 0,
    minutesPlayed: scorer.games.minutes_played,
  };
}

/**
 * Wraps vnexpress-api.ts. Caches the raw fetch per adapter instance so that
 * multiple `fetchCandidates` calls within one sync run (e.g. per-fixture
 * Final-day resolution followed by the post-loop candidate sync) hit
 * vnexpress once, not once per call — construct a fresh instance per sync
 * run rather than reusing one across runs, or this cache will serve stale
 * standings.
 */
export class VnexpressTopScorerAdapter implements AwardSourceAdapter {
  private cachedScorers: Promise<VnexpressTopScorer[]> | null = null;

  constructor(
    private readonly fetchTopScorersImpl: () => Promise<
      VnexpressTopScorer[]
    > = fetchTopScorers,
  ) {}

  private getScorers(): Promise<VnexpressTopScorer[]> {
    return (this.cachedScorers ??= this.fetchTopScorersImpl());
  }

  async fetchCandidates(
    awardKey: AwardKey,
  ): Promise<NormalizedAwardCandidate[]> {
    if (awardKey !== "topScorer") {
      throw new Error(
        `VnexpressTopScorerAdapter does not support award "${awardKey}"`,
      );
    }

    const scorers = await this.getScorers();
    return [...scorers].sort(compareGoldenBoot).map(toNormalizedCandidate);
  }
}
