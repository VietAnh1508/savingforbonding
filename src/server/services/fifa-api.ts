const FIFA_API_BASE = "https://api.fifa.com/api/v3";
const FIFA_WORLD_CUP_COMPETITION_ID = "17";

type FifaLocalizedText = {
  Locale: string;
  Description: string;
};

type FifaTeam = {
  TeamName: FifaLocalizedText[] | null;
  Score: number | null;
};

export type FifaMatch = {
  IdMatch: string;
  IdCompetition: string;
  MatchNumber: number | null;
  Date: string;
  LocalDate: string;
  MatchStatus: number;
  MatchTime: string | null;
  Home: FifaTeam | null;
  Away: FifaTeam | null;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  PlaceHolderA: string | null;
  PlaceHolderB: string | null;
  CompetitionName: FifaLocalizedText[];
  SeasonName: FifaLocalizedText[];
  StageName: FifaLocalizedText[];
  GroupName: FifaLocalizedText[];
  Stadium: {
    Name: FifaLocalizedText[];
    CityName: FifaLocalizedText[];
  } | null;
};

type FifaMatchesResponse = {
  Results: FifaMatch[];
  ContinuationToken?: string;
};

function localizedDescription(
  items: FifaLocalizedText[] | null | undefined,
): string | null {
  if (!items?.length) return null;
  const preferred =
    items.find((item) => item.Locale.toLowerCase() === "en-gb") ?? items[0];
  return preferred?.Description ?? null;
}

export function fifaTeamName(
  team: FifaTeam | null,
  placeholder: string | null,
): string {
  const name = localizedDescription(team?.TeamName ?? null);
  if (name) return name;
  if (placeholder) return placeholder;
  return "TBD";
}

export function fifaTournamentName(match: FifaMatch): string {
  return (
    localizedDescription(match.SeasonName) ??
    localizedDescription(match.CompetitionName) ??
    "FIFA World Cup"
  );
}

const LIVE_STATUSES = new Set([3, 8, 9, 12]);

export function mapFifaMatchStatus(match: FifaMatch) {
  const { MatchStatus: status, HomeTeamScore, AwayTeamScore } = match;

  if (status === 0) return "COMPLETED" as const;
  if (status === 1) return "SCHEDULED" as const;
  if (status === 7) return "POSTPONED" as const;
  if (status === 4) return "CANCELLED" as const;
  if (LIVE_STATUSES.has(status)) return "LIVE" as const;

  if (HomeTeamScore !== null && AwayTeamScore !== null) {
    return "COMPLETED" as const;
  }

  return "SCHEDULED" as const;
}

async function fetchFifaMatchesPage(params: URLSearchParams): Promise<FifaMatch[]> {
  const url = `${FIFA_API_BASE}/calendar/matches?${params.toString()}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`FIFA API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as FifaMatchesResponse;
  return data.Results ?? [];
}

export async function fetchWorldCupFixtures(
  seasonYear = 2026,
): Promise<FifaMatch[]> {
  const from = `${seasonYear}-06-01`;
  const to = `${seasonYear}-07-31`;

  const params = new URLSearchParams({
    from,
    to,
    language: "en",
    count: "500",
    idCompetition: FIFA_WORLD_CUP_COMPETITION_ID,
  });

  const matches = await fetchFifaMatchesPage(params);

  return matches
    .filter((match) => match.IdCompetition === FIFA_WORLD_CUP_COMPETITION_ID)
    .sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
}
