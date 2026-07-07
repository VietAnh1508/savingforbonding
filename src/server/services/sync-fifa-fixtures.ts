import { buildFifaMatchPatch } from "~/lib/fifa-sync";
import { deriveResult } from "~/lib/match";
import { resolveChampionVotes } from "~/server/services/champion-vote";
import {
  fetchQualifiedTeams,
  fetchWorldCupFixtures,
  fifaTeamName,
  fifaTournamentName,
  localizedDescription,
  mapFifaMatchStatus,
  parseFifaKickoffToUtc,
  type FifaMatch,
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
  championCandidatesSynced: number;
  championVotesResolved: number;
};

/**
 * When the Final's result is in, settles every champion vote against the
 * FIFA-reported winner. Checked on every sync (not just the moment the match
 * transitions to COMPLETED) so a missed candidate lookup or a later re-sync
 * naturally retries — resolveChampionVotes is delta-based, so repeat calls
 * with the same winner are no-ops.
 */
async function resolveChampionIfFinal(
  db: PrismaClient,
  fixture: FifaMatch,
): Promise<number> {
  if (mapFifaMatchStatus(fixture) !== "COMPLETED" || !fixture.Winner) {
    return 0;
  }

  // Match against the seeded Stage name (same convention as isChampionVotingOpen)
  // rather than the fixture's own StageName display string, which is unverified.
  const stage = await db.stage.findUnique({ where: { id: fixture.IdStage } });
  if (stage?.name !== "Final") return 0;

  const winner = await db.championCandidate.findUnique({
    where: { fifaTeamId: fixture.Winner },
  });
  if (!winner) {
    console.warn(
      `Final winner ${fixture.Winner} has no matching ChampionCandidate`,
    );
    return 0;
  }

  const { usersUpdated } = await resolveChampionVotes(db, winner.id);
  return usersUpdated;
}

async function syncChampionCandidates(db: PrismaClient): Promise<number> {
  const quarterFinalStage = await db.stage.findFirst({
    where: { name: "Quarter-final" },
  });
  if (!quarterFinalStage) return 0;

  const qualifiedTeams = await fetchQualifiedTeams(quarterFinalStage.id);

  await Promise.all(
    qualifiedTeams.map((team) =>
      db.championCandidate.upsert({
        where: { fifaTeamId: team.IdTeam },
        create: {
          fifaTeamId: team.IdTeam,
          teamName: localizedDescription(team.TeamName) ?? "TBD",
          countryCode: team.IdCountry,
        },
        update: {
          teamName: localizedDescription(team.TeamName) ?? "TBD",
          countryCode: team.IdCountry,
        },
      }),
    ),
  );

  return qualifiedTeams.length;
}

export async function syncFifaFixtures(
  db: PrismaClient,
): Promise<SyncFifaFixturesResult> {
  const fixtures = await fetchWorldCupFixtures();

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let teamsUpdated = 0;
  let resolved = 0;
  let championVotesResolved = 0;

  for (const fixture of fixtures) {
    const externalId = fixture.IdMatch;
    const fifaStatus = mapFifaMatchStatus(fixture);
    const fifaHome = fifaTeamName(fixture.Home, fixture.PlaceHolderA);
    const fifaAway = fifaTeamName(fixture.Away, fixture.PlaceHolderB);
    const fifaKickoff = parseFifaKickoffToUtc(fixture.Date);
    const tournament = fifaTournamentName(fixture);
    const stageId = fixture.IdStage;

    const fifaHomeScore = fixture.HomeTeamScore ?? fixture.Home?.Score ?? null;
    const fifaAwayScore = fixture.AwayTeamScore ?? fixture.Away?.Score ?? null;
    const fifaHomePenaltyScore = fixture.HomeTeamPenaltyScore ?? null;
    const fifaAwayPenaltyScore = fixture.AwayTeamPenaltyScore ?? null;

    championVotesResolved += await resolveChampionIfFinal(db, fixture);

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
          homePenaltyScore: fifaHomePenaltyScore,
          awayPenaltyScore: fifaAwayPenaltyScore,
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
        homePenaltyScore: fifaHomePenaltyScore,
        awayPenaltyScore: fifaAwayPenaltyScore,
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
          homePenaltyScore: patch.homePenaltyScore,
          awayPenaltyScore: patch.awayPenaltyScore,
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

  const championCandidatesSynced = await syncChampionCandidates(db);

  return {
    fetched: fixtures.length,
    created,
    updated,
    unchanged,
    teamsUpdated,
    resolved,
    championCandidatesSynced,
    championVotesResolved,
  };
}
