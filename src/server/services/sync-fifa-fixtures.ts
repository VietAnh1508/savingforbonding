import { buildFifaMatchPatch } from "~/lib/fifa-sync";
import {
  buildKqbdKickoffLookup,
  fetchKqbdWorldCupSchedule,
  lookupKqbdKickoff,
} from "~/lib/kqbd-schedule";
import { deriveResult } from "~/lib/match";
import {
  fetchWorldCupFixtures,
  fifaTeamName,
  fifaTournamentName,
  mapFifaMatchStatus,
  parseFifaKickoffToUtc,
} from "~/server/services/fifa-api";
import { resolveMatchVotes } from "~/server/services/resolve-votes";
import { type PrismaClient } from "../../../generated/prisma";

export type SyncFifaFixturesResult = {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  teamsUpdated: number;
  resolved: number;
};

export async function syncFifaFixtures(
  db: PrismaClient,
  seasonYear = 2026,
): Promise<SyncFifaFixturesResult> {
  const [fixtures, kqbdFixtures] = await Promise.all([
    fetchWorldCupFixtures(),
    fetchKqbdWorldCupSchedule(seasonYear).catch((error: unknown) => {
      console.warn(
        "KQBD schedule fetch failed; using FIFA kickoff times only.",
        error,
      );
      return [];
    }),
  ]);

  const kqbdKickoffLookup = buildKqbdKickoffLookup(kqbdFixtures);

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let teamsUpdated = 0;
  let resolved = 0;

  for (const fixture of fixtures) {
    const externalId = fixture.IdMatch;
    const fifaStatus = mapFifaMatchStatus(fixture);
    const fifaHome = fifaTeamName(fixture.Home, fixture.PlaceHolderA);
    const fifaAway = fifaTeamName(fixture.Away, fixture.PlaceHolderB);
    const fifaKickoff =
      lookupKqbdKickoff(fifaHome, fifaAway, kqbdKickoffLookup) ??
      parseFifaKickoffToUtc(fixture.Date);
    const tournament = fifaTournamentName(fixture);
    const stageId = fixture.IdStage;

    const fifaHomeScore = fixture.HomeTeamScore ?? fixture.Home?.Score ?? null;
    const fifaAwayScore = fixture.AwayTeamScore ?? fixture.Away?.Score ?? null;

    const existing = await db.match.findUnique({
      where: { externalId },
    });

    if (!existing) {
      const status = fifaStatus;
      const homeScore = fifaHomeScore;
      const awayScore = fifaAwayScore;
      const result =
        status === "COMPLETED" && homeScore !== null && awayScore !== null
          ? deriveResult(homeScore, awayScore)
          : null;

      const match = await db.match.create({
        data: {
          externalId,
          tournament,
          homeCountry: fifaHome,
          awayCountry: fifaAway,
          kickoffAt: fifaKickoff,
          status,
          homeScore,
          awayScore,
          result,
          homeRatio: 0,
          awayRatio: 0,
          stageId,
        },
      });
      created++;

      if (status === "COMPLETED" && homeScore !== null && awayScore !== null) {
        const resolution = await resolveMatchVotes(
          db,
          match.id,
          homeScore,
          awayScore,
        );
        if (!resolution.alreadyResolved) resolved++;
      }

      continue;
    }

    const {
      patch,
      teamsUpdated: teamsChanged,
      changed,
    } = buildFifaMatchPatch(
      existing,
      {
        tournament,
        homeCountry: fifaHome,
        awayCountry: fifaAway,
        kickoffAt: fifaKickoff,
        status: fifaStatus,
        homeScore: fifaHomeScore,
        awayScore: fifaAwayScore,
        stageId,
      },
      deriveResult,
    );

    if (!changed) {
      unchanged++;
      continue;
    }

    if (teamsChanged) teamsUpdated++;

    const wasCompleted = existing.status === "COMPLETED";
    const isNowCompleted = patch.status === "COMPLETED";
    const isTransitioningToCompleted =
      !wasCompleted &&
      isNowCompleted &&
      patch.homeScore !== null &&
      patch.awayScore !== null;

    // When transitioning to COMPLETED, omit status/scores/result here —
    // resolveMatchVotes writes those fields itself, and must see the match
    // as not-yet-resolved so it applies the BEER_NO_VOTE penalty to non-voters.
    await db.match.update({
      where: { externalId },
      data: {
        tournament: patch.tournament,
        homeCountry: patch.homeCountry,
        awayCountry: patch.awayCountry,
        kickoffAt: patch.kickoffAt,
        stageId: patch.stageId,
        ...(!isTransitioningToCompleted && {
          status: patch.status,
          homeScore: patch.homeScore,
          awayScore: patch.awayScore,
          result: patch.result,
        }),
      },
    });
    updated++;

    if (isTransitioningToCompleted) {
      const resolution = await resolveMatchVotes(
        db,
        existing.id,
        patch.homeScore!,
        patch.awayScore!,
      );
      if (!resolution.alreadyResolved) resolved++;
    }
  }

  return {
    fetched: fixtures.length,
    created,
    updated,
    unchanged,
    teamsUpdated,
    resolved,
  };
}
