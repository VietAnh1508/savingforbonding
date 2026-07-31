import {
  FIFA_WORLD_CUP_SEASON_ID,
  fetchQualifiedTeams,
  fetchStages,
  fetchWorldCupFixtures,
  fifaTeamCountryCode,
  fifaTeamName,
  localizedDescription,
  mapFifaMatchStatus,
  parseFifaKickoffToUtc,
  type FifaMatch,
  type FifaQualifiedTeam,
  type FifaStage,
} from "~/server/services/fifa-api";
import {
  type FixtureSourceAdapter,
  type NormalizedMatch,
  type NormalizedStage,
  type NormalizedTeam,
} from "./types";

function toNormalizedStage(stage: FifaStage): NormalizedStage {
  return {
    externalId: stage.IdStage,
    name: localizedDescription(stage.Name) ?? stage.Name[0]!.Description,
    startDate: new Date(stage.StartDate),
    endDate: new Date(stage.EndDate),
    sequenceOrder: stage.SequenceOrder,
    isKnockout: stage.Type === 0,
  };
}

function toNormalizedTeam(team: FifaQualifiedTeam): NormalizedTeam {
  return {
    externalId: team.IdTeam,
    name: localizedDescription(team.TeamName) ?? "TBD",
    countryCode: team.IdCountry,
  };
}

function toNormalizedMatch(fixture: FifaMatch): NormalizedMatch {
  return {
    externalId: fixture.IdMatch,
    stageExternalId: fixture.IdStage,
    status: mapFifaMatchStatus(fixture),
    homeName: fifaTeamName(fixture.Home, fixture.PlaceHolderA),
    awayName: fifaTeamName(fixture.Away, fixture.PlaceHolderB),
    homeCountryCode: fifaTeamCountryCode(fixture.Home),
    awayCountryCode: fifaTeamCountryCode(fixture.Away),
    kickoffAt: parseFifaKickoffToUtc(fixture.Date),
    homeScore: fixture.HomeTeamScore ?? fixture.Home?.Score ?? null,
    awayScore: fixture.AwayTeamScore ?? fixture.Away?.Score ?? null,
    homePenaltyScore: fixture.HomeTeamPenaltyScore ?? null,
    awayPenaltyScore: fixture.AwayTeamPenaltyScore ?? null,
    winnerExternalTeamId: fixture.Winner,
  };
}

type FifaWorldCupAdapterOptions = {
  seasonId?: string;
  fetchStages?: (seasonId: string) => Promise<FifaStage[]>;
  fetchFixtures?: (seasonId: string) => Promise<FifaMatch[]>;
  fetchQualifiedTeams?: (
    stageId: string,
    seasonId: string,
  ) => Promise<FifaQualifiedTeam[]>;
};

/**
 * Wraps fifa-api.ts, mapping FIFA's wire shapes into the source-agnostic
 * normalized shapes — status codes, bracket placeholders, and localized
 * names are all resolved here, not downstream in sync-fifa-fixtures.ts.
 */
export class FifaWorldCupAdapter implements FixtureSourceAdapter {
  private readonly seasonId: string;
  private readonly fetchStagesImpl: (seasonId: string) => Promise<FifaStage[]>;
  private readonly fetchFixturesImpl: (
    seasonId: string,
  ) => Promise<FifaMatch[]>;
  private readonly fetchQualifiedTeamsImpl: (
    stageId: string,
    seasonId: string,
  ) => Promise<FifaQualifiedTeam[]>;

  constructor({
    seasonId = FIFA_WORLD_CUP_SEASON_ID,
    fetchStages: fetchStagesImpl = fetchStages,
    fetchFixtures: fetchFixturesImpl = fetchWorldCupFixtures,
    fetchQualifiedTeams: fetchQualifiedTeamsImpl = fetchQualifiedTeams,
  }: FifaWorldCupAdapterOptions = {}) {
    this.seasonId = seasonId;
    this.fetchStagesImpl = fetchStagesImpl;
    this.fetchFixturesImpl = fetchFixturesImpl;
    this.fetchQualifiedTeamsImpl = fetchQualifiedTeamsImpl;
  }

  async fetchStages(): Promise<NormalizedStage[]> {
    const stages = await this.fetchStagesImpl(this.seasonId);
    return stages.map(toNormalizedStage);
  }

  async fetchFixtures(): Promise<NormalizedMatch[]> {
    const fixtures = await this.fetchFixturesImpl(this.seasonId);
    return fixtures.map(toNormalizedMatch);
  }

  async fetchQualifiedTeams(stageExternalId: string): Promise<NormalizedTeam[]> {
    const teams = await this.fetchQualifiedTeamsImpl(
      stageExternalId,
      this.seasonId,
    );
    return teams.map(toNormalizedTeam);
  }
}
