export type FifaLocalizedText = {
  Locale: string;
  Description: string;
};

export type FifaTeam = {
  TeamName: FifaLocalizedText[] | null;
  Score: number | null;
  IdCountry: string | null;
};

export type FifaMatch = {
  IdMatch: string;
  IdCompetition: string;
  IdStage: string;
  MatchNumber: number | null;
  Date: string;
  LocalDate: string;
  MatchStatus: number;
  MatchTime: string | null;
  Home: FifaTeam | null;
  Away: FifaTeam | null;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  HomeTeamPenaltyScore: number | null;
  AwayTeamPenaltyScore: number | null;
  /** FIFA-computed winning team's `IdTeam` (accounts for extra time/penalties); null if undecided. */
  Winner: string | null;
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

export type FifaMatchesResponse = {
  Results: FifaMatch[];
  ContinuationToken?: string;
};

export type FifaStage = {
  IdStage: string;
  Name: FifaLocalizedText[];
  IdSeason: string;
  StartDate: string;
  EndDate: string;
  Type: number;
  SequenceOrder: number;
};

export type FifaStagesResponse = {
  Results: FifaStage[];
};

export type FifaQualifiedTeam = {
  IdTeam: string;
  IdCountry: string;
  TeamName: FifaLocalizedText[];
};

export type FifaQualifiedTeamsResponse = {
  Results: FifaQualifiedTeam[];
  ContinuationToken?: string | null;
};
