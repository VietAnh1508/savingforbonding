const VNEXPRESS_TOPSCORER_URL =
  "https://gw.vnexpress.net/football/topscorer?league_id=1";

export type VnexpressTopScorer = {
  player_id: number;
  player_name: string;
  nationality: string;
  goals: { total: number; assists?: number };
  games: { minutes_played: number };
};

type VnexpressTopScorerResponse = {
  data?: Record<string, { data?: VnexpressTopScorer[] }>;
};

export async function fetchTopScorers(): Promise<VnexpressTopScorer[]> {
  const response = await fetch(VNEXPRESS_TOPSCORER_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; SavingForBondingBot/1.0)",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(
      `vnexpress API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as VnexpressTopScorerResponse;
  return data.data?.["1"]?.data ?? [];
}

/**
 * Ranks by the real FIFA Golden Boot tiebreaker: most goals, then most
 * assists, then fewest minutes played. Players level on all three share the
 * award.
 */
export function compareGoldenBoot(
  a: VnexpressTopScorer,
  b: VnexpressTopScorer,
): number {
  if (b.goals.total !== a.goals.total) return b.goals.total - a.goals.total;
  const aAssists = a.goals.assists ?? 0;
  const bAssists = b.goals.assists ?? 0;
  if (bAssists !== aAssists) return bAssists - aAssists;
  return a.games.minutes_played - b.games.minutes_played;
}
