import { describe, expect, it } from "vitest";
import {
  type FifaMatch,
  type FifaQualifiedTeam,
  type FifaStage,
} from "~/server/services/fifa/types";
import { FifaWorldCupAdapter } from "./fifa-world-cup-adapter";

function fixture(overrides: Partial<FifaMatch> = {}): FifaMatch {
  return {
    IdMatch: "m1",
    IdCompetition: "c1",
    IdStage: "s1",
    MatchNumber: 1,
    Date: "2026-06-11T19:00:00Z",
    LocalDate: "2026-06-11T19:00:00Z",
    MatchStatus: 1,
    MatchTime: null,
    Home: { TeamName: [{ Locale: "en-GB", Description: "Argentina" }], Score: null, IdCountry: "ARG" },
    Away: { TeamName: [{ Locale: "en-GB", Description: "France" }], Score: null, IdCountry: "FRA" },
    HomeTeamScore: null,
    AwayTeamScore: null,
    HomeTeamPenaltyScore: null,
    AwayTeamPenaltyScore: null,
    Winner: null,
    PlaceHolderA: null,
    PlaceHolderB: null,
    CompetitionName: [],
    SeasonName: [],
    StageName: [],
    GroupName: [],
    Stadium: null,
    ...overrides,
  };
}

function stage(overrides: Partial<FifaStage> = {}): FifaStage {
  return {
    IdStage: "s1",
    Name: [{ Locale: "en-GB", Description: "Final" }],
    IdSeason: "285023",
    StartDate: "2026-07-19T00:00:00Z",
    EndDate: "2026-07-19T00:00:00Z",
    Type: 0,
    SequenceOrder: 7,
    ...overrides,
  };
}

function qualifiedTeam(overrides: Partial<FifaQualifiedTeam> = {}): FifaQualifiedTeam {
  return {
    IdTeam: "t1",
    IdCountry: "ARG",
    TeamName: [{ Locale: "en-GB", Description: "Argentina" }],
    ...overrides,
  };
}

describe("FifaWorldCupAdapter", () => {
  it("passes the season id through to every fetch function", async () => {
    let seenStagesSeasonId: string | undefined;
    let seenFixturesSeasonId: string | undefined;
    let seenTeamsSeasonId: string | undefined;

    const adapter = new FifaWorldCupAdapter({
      seasonId: "season-42",
      fetchStages: async (seasonId) => {
        seenStagesSeasonId = seasonId;
        return [];
      },
      fetchFixtures: async (seasonId) => {
        seenFixturesSeasonId = seasonId;
        return [];
      },
      fetchQualifiedTeams: async (_stageId, seasonId) => {
        seenTeamsSeasonId = seasonId;
        return [];
      },
    });

    await adapter.fetchStages();
    await adapter.fetchFixtures();
    await adapter.fetchQualifiedTeams("s1");

    expect(seenStagesSeasonId).toBe("season-42");
    expect(seenFixturesSeasonId).toBe("season-42");
    expect(seenTeamsSeasonId).toBe("season-42");
  });

  it("maps a fixture onto the normalized match shape", async () => {
    const adapter = new FifaWorldCupAdapter({
      fetchFixtures: async () => [
        fixture({
          IdMatch: "m1",
          IdStage: "s1",
          MatchStatus: 0,
          HomeTeamScore: 2,
          AwayTeamScore: 1,
          Winner: "t1",
        }),
      ],
    });

    const [match] = await adapter.fetchFixtures();

    expect(match).toEqual({
      externalId: "m1",
      stageExternalId: "s1",
      status: "COMPLETED",
      homeName: "Argentina",
      awayName: "France",
      homeCountryCode: "ARG",
      awayCountryCode: "FRA",
      kickoffAt: new Date("2026-06-11T19:00:00Z"),
      homeScore: 2,
      awayScore: 1,
      homePenaltyScore: null,
      awayPenaltyScore: null,
      winnerExternalTeamId: "t1",
    });
  });

  it("falls back to the bracket placeholder, then TBD, for an undecided team", async () => {
    const adapter = new FifaWorldCupAdapter({
      fetchFixtures: async () => [
        fixture({ Home: null, PlaceHolderA: "Winner Group A", Away: null, PlaceHolderB: null }),
      ],
    });

    const [match] = await adapter.fetchFixtures();

    expect(match!.homeName).toBe("Winner Group A");
    expect(match!.awayName).toBe("TBD");
    expect(match!.homeCountryCode).toBeNull();
    expect(match!.awayCountryCode).toBeNull();
  });

  it("falls back from HomeTeamScore/AwayTeamScore to the per-team Score field", async () => {
    const adapter = new FifaWorldCupAdapter({
      fetchFixtures: async () => [
        fixture({
          HomeTeamScore: null,
          AwayTeamScore: null,
          Home: { TeamName: null, Score: 3, IdCountry: "ARG" },
          Away: { TeamName: null, Score: 0, IdCountry: "FRA" },
        }),
      ],
    });

    const [match] = await adapter.fetchFixtures();

    expect(match!.homeScore).toBe(3);
    expect(match!.awayScore).toBe(0);
  });

  it("maps a stage onto the normalized stage shape", async () => {
    const adapter = new FifaWorldCupAdapter({
      fetchStages: async () => [stage({ IdStage: "s7", Type: 0, SequenceOrder: 7 })],
    });

    const [normalized] = await adapter.fetchStages();

    expect(normalized).toEqual({
      externalId: "s7",
      name: "Final",
      startDate: new Date("2026-07-19T00:00:00Z"),
      endDate: new Date("2026-07-19T00:00:00Z"),
      sequenceOrder: 7,
      isKnockout: true,
    });
  });

  it("maps a qualified team onto the normalized team shape", async () => {
    const adapter = new FifaWorldCupAdapter({
      fetchQualifiedTeams: async () => [
        qualifiedTeam({ IdTeam: "t9", IdCountry: "BRA", TeamName: [{ Locale: "en-GB", Description: "Brazil" }] }),
      ],
    });

    const [team] = await adapter.fetchQualifiedTeams("s1");

    expect(team).toEqual({ externalId: "t9", name: "Brazil", countryCode: "BRA" });
  });
});
