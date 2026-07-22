import { describe, expect, it } from "vitest";
import { type VnexpressTopScorer } from "~/server/services/vnexpress-api";
import { VnexpressTopScorerAdapter } from "./vnexpress-top-scorer-adapter";

function scorer(
  overrides: Partial<{
    player_id: number;
    player_name: string;
    nationality: string;
    logo_team: string;
    goals: number;
    assists: number;
    minutes_played: number;
  }> = {},
): VnexpressTopScorer {
  const {
    player_id = 1,
    player_name = "Player",
    nationality = "Argentina",
    logo_team = "https://is.vnecdn.net/objects/teams/1.png?v=1",
    goals = 0,
    assists = 0,
    minutes_played = 0,
  } = overrides;

  return {
    player_id,
    player_name,
    nationality,
    logo_team,
    goals: { total: goals, assists },
    games: { minutes_played },
  };
}

describe("VnexpressTopScorerAdapter", () => {
  it("rejects award keys other than topScorer", async () => {
    const adapter = new VnexpressTopScorerAdapter(async () => []);

    // @ts-expect-error -- exercising the runtime guard against an invalid key
    await expect(adapter.fetchCandidates("champion")).rejects.toThrow(
      /does not support award/,
    );
  });

  it("maps fields onto the normalized candidate shape", async () => {
    const adapter = new VnexpressTopScorerAdapter(async () => [
      scorer({
        player_id: 10,
        player_name: "Messi",
        nationality: "Argentina",
        logo_team: "https://is.vnecdn.net/objects/teams/2.png?v=1",
        goals: 8,
        assists: 3,
        minutes_played: 540,
      }),
    ]);

    const result = await adapter.fetchCandidates("topScorer");

    expect(result).toEqual([
      {
        externalId: "10",
        name: "Messi",
        countryName: "Argentina",
        countryCode: "ARG",
        logoUrl: "https://is.vnecdn.net/objects/teams/2.png?v=1",
        goals: 8,
        assists: 3,
        minutesPlayed: 540,
      },
    ]);
  });

  it("sorts by the Golden Boot tiebreak chain: goals desc, assists desc, minutes played asc", async () => {
    const trailing = scorer({
      player_id: 1,
      player_name: "Trailing on goals",
      goals: 5,
    });
    const fewerAssists = scorer({
      player_id: 2,
      player_name: "Fewer assists",
      goals: 8,
      assists: 1,
      minutes_played: 400,
    });
    const moreMinutes = scorer({
      player_id: 3,
      player_name: "More minutes played",
      goals: 8,
      assists: 3,
      minutes_played: 600,
    });
    const leader = scorer({
      player_id: 4,
      player_name: "Leader",
      goals: 8,
      assists: 3,
      minutes_played: 500,
    });

    const adapter = new VnexpressTopScorerAdapter(async () => [
      trailing,
      fewerAssists,
      moreMinutes,
      leader,
    ]);

    const result = await adapter.fetchCandidates("topScorer");

    expect(result.map((c) => c.externalId)).toEqual(["4", "3", "2", "1"]);
  });

  it("returns every tied leader with identical sort keys, in stable order", async () => {
    const coLeaderA = scorer({
      player_id: 1,
      player_name: "Co-leader A",
      goals: 6,
      assists: 2,
      minutes_played: 450,
    });
    const coLeaderB = scorer({
      player_id: 2,
      player_name: "Co-leader B",
      goals: 6,
      assists: 2,
      minutes_played: 450,
    });
    const behind = scorer({
      player_id: 3,
      player_name: "Behind",
      goals: 4,
    });

    const adapter = new VnexpressTopScorerAdapter(async () => [
      behind,
      coLeaderA,
      coLeaderB,
    ]);

    const result = await adapter.fetchCandidates("topScorer");

    expect(result.map((c) => c.externalId)).toEqual(["1", "2", "3"]);
    expect(result[0]).toMatchObject({ goals: 6, assists: 2, minutesPlayed: 450 });
    expect(result[1]).toMatchObject({ goals: 6, assists: 2, minutesPlayed: 450 });
  });

  it("resolves countryCode from nationality, or null when unrecognized", async () => {
    const recognized = scorer({
      player_id: 1,
      nationality: "France",
    });
    const unrecognized = scorer({
      player_id: 2,
      nationality: "Atlantis",
    });

    const adapter = new VnexpressTopScorerAdapter(async () => [
      recognized,
      unrecognized,
    ]);

    const result = await adapter.fetchCandidates("topScorer");

    expect(result.find((c) => c.externalId === "1")?.countryCode).toBe("FRA");
    expect(result.find((c) => c.externalId === "2")?.countryCode).toBeNull();
  });

  it("fetches the underlying source only once across repeated calls", async () => {
    let callCount = 0;
    const adapter = new VnexpressTopScorerAdapter(async () => {
      callCount++;
      return [scorer()];
    });

    await adapter.fetchCandidates("topScorer");
    await adapter.fetchCandidates("topScorer");

    expect(callCount).toBe(1);
  });
});
