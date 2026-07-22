import { buildFifaMatchPatch } from "~/lib/fifa-sync";
import { deriveResult } from "~/lib/match";
import {
  type AwardSourceAdapter,
  type NormalizedAwardCandidate,
} from "~/server/services/adapters/types";
import { isTiedForGoldenBoot } from "~/server/services/adapters/golden-boot";
import { VnexpressTopScorerAdapter } from "~/server/services/adapters/vnexpress-top-scorer-adapter";
import { getActiveTournamentId } from "~/server/services/active-tournament";
import { resolveChampionVotes } from "~/server/services/champion-vote";
import { resolveTopScorerVotes } from "~/server/services/top-scorer-vote";
import {
  fetchQualifiedTeams,
  fetchWorldCupFixtures,
  fifaTeamCountryCode,
  fifaTeamName,
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
  topScorerCandidatesSynced: number;
  topScorerVotesResolved: number;
};

const TOP_SCORER_CANDIDATE_COUNT = 10;

async function upsertTopScorerCandidate(
  db: PrismaClient,
  candidate: NormalizedAwardCandidate,
  tournamentId: string,
) {
  return db.topScorerCandidate.upsert({
    where: {
      externalPlayerId_tournamentId: {
        externalPlayerId: candidate.externalId,
        tournamentId,
      },
    },
    create: {
      externalPlayerId: candidate.externalId,
      tournamentId,
      playerName: candidate.name,
      countryName: candidate.countryName,
      goals: candidate.goals,
      assists: candidate.assists,
      minutesPlayed: candidate.minutesPlayed,
    },
    update: {
      playerName: candidate.name,
      countryName: candidate.countryName,
      goals: candidate.goals,
      assists: candidate.assists,
      minutesPlayed: candidate.minutesPlayed,
    },
  });
}

/**
 * Whether this fixture is the completed Final — the trigger both champion and
 * top-scorer resolution wait for. Matched against the seeded Stage name (same
 * convention as isChampionVotingOpen) rather than the fixture's own StageName
 * display string, which is unverified.
 */
async function isFixtureCompletedFinal(
  db: PrismaClient,
  fixture: FifaMatch,
): Promise<boolean> {
  if (mapFifaMatchStatus(fixture) !== "COMPLETED") return false;
  const stage = await db.stage.findUnique({ where: { id: fixture.IdStage } });
  return stage?.name === "Final";
}

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
  isFinal: boolean,
  tournamentId: string,
): Promise<number> {
  if (!isFinal || !fixture.Winner) return 0;

  const winner = await db.championCandidate.findUnique({
    where: {
      fifaTeamId_tournamentId: { fifaTeamId: fixture.Winner, tournamentId },
    },
  });
  if (!winner) {
    console.warn(
      `Final winner ${fixture.Winner} has no matching ChampionCandidate`,
    );
    return 0;
  }

  const { usersUpdated } = await resolveChampionVotes(
    db,
    winner.id,
    tournamentId,
  );
  return usersUpdated;
}

/**
 * When the Final's result is in, settles every top scorer vote against the
 * current vnexpress standings. Unlike champion, the winner isn't guaranteed
 * to already have a TopScorerCandidate row (a late surge in the Final is
 * plausible for goal-scoring, unlike winning the whole tournament), so this
 * fetches fresh data and upserts the winner(s) before resolving. Checked on
 * every sync so a lagging vnexpress result or a later re-sync naturally
 * retries — resolveTopScorerVotes is delta-based, so repeat calls with the
 * same winner set are no-ops.
 *
 * Winner(s) are the scorers tied for first under the full Golden Boot
 * tiebreak chain (goals, then assists, then minutes played — see
 * compareGoldenBoot), not goals alone: two players level on goals but ahead
 * on assists or minutes played aren't joint winners.
 */
async function resolveTopScorerIfFinal(
  db: PrismaClient,
  fixture: FifaMatch,
  isFinal: boolean,
  awardAdapter: AwardSourceAdapter,
  tournamentId: string,
): Promise<number> {
  if (!isFinal) return 0;

  // Already sorted best-to-worst by the adapter (goals desc, assists desc,
  // minutes played asc — the Golden Boot tiebreak chain).
  const scorers = await awardAdapter.fetchCandidates("topScorer");
  if (!scorers.length) return 0;

  const [best, ...rest] = scorers;
  const winners = [
    best!,
    ...rest.filter((candidate) => isTiedForGoldenBoot(candidate, best!)),
  ];

  const winnerCandidates = await Promise.all(
    winners.map((winner) => upsertTopScorerCandidate(db, winner, tournamentId)),
  );

  const { usersUpdated } = await resolveTopScorerVotes(
    db,
    winnerCandidates.map((c) => c.id),
    tournamentId,
  );
  return usersUpdated;
}

/**
 * Only the 4 semifinalists play the 2 remaining matches (Play-off for third
 * place and the Final), so a player from any other team can't add to their
 * tally anymore. Restrict candidates to those teams — matched by FIFA country
 * code rather than raw name, since vnexpress's `nationality` string doesn't
 * always match FIFA's own team name spelling.
 */
async function syncTopScorerCandidates(
  db: PrismaClient,
  awardAdapter: AwardSourceAdapter,
  tournamentId: string,
): Promise<number> {
  const semiFinalStage = await db.stage.findFirst({
    where: { name: "Semi-final", tournamentId },
  });
  if (!semiFinalStage) return 0;

  const [qualifiedTeams, scorers] = await Promise.all([
    fetchQualifiedTeams(semiFinalStage.id),
    awardAdapter.fetchCandidates("topScorer"),
  ]);
  const eligibleCountryCodes = new Set(
    qualifiedTeams.map((team) => team.IdCountry),
  );

  const topScorers = scorers
    .filter(
      (candidate) =>
        candidate.countryCode !== null &&
        eligibleCountryCodes.has(candidate.countryCode),
    )
    .slice(0, TOP_SCORER_CANDIDATE_COUNT);

  await Promise.all(
    topScorers.map((scorer) =>
      upsertTopScorerCandidate(db, scorer, tournamentId),
    ),
  );

  return topScorers.length;
}

async function syncChampionCandidates(
  db: PrismaClient,
  tournamentId: string,
): Promise<number> {
  const semiFinalStage = await db.stage.findFirst({
    where: { name: "Semi-final", tournamentId },
  });
  if (!semiFinalStage) return 0;

  const qualifiedTeams = await fetchQualifiedTeams(semiFinalStage.id);

  await Promise.all(
    qualifiedTeams.map((team) =>
      db.championCandidate.upsert({
        where: {
          fifaTeamId_tournamentId: { fifaTeamId: team.IdTeam, tournamentId },
        },
        create: {
          fifaTeamId: team.IdTeam,
          tournamentId,
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
  const [fixtures, tournamentId] = await Promise.all([
    fetchWorldCupFixtures(),
    getActiveTournamentId(db),
  ]);

  // One instance shared across resolveTopScorerIfFinal (per-fixture) and
  // syncTopScorerCandidates (post-loop) — it caches its own vnexpress fetch,
  // so a Final-day sync hits vnexpress once, not twice.
  const topScorerAdapter: AwardSourceAdapter = new VnexpressTopScorerAdapter();

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let teamsUpdated = 0;
  let resolved = 0;
  let championVotesResolved = 0;
  let topScorerVotesResolved = 0;

  for (const fixture of fixtures) {
    const externalId = fixture.IdMatch;
    const fifaStatus = mapFifaMatchStatus(fixture);
    const fifaHome = fifaTeamName(fixture.Home, fixture.PlaceHolderA);
    const fifaAway = fifaTeamName(fixture.Away, fixture.PlaceHolderB);
    const fifaHomeCode = fifaTeamCountryCode(fixture.Home);
    const fifaAwayCode = fifaTeamCountryCode(fixture.Away);
    const fifaKickoff = parseFifaKickoffToUtc(fixture.Date);
    const stageId = fixture.IdStage;

    const fifaHomeScore = fixture.HomeTeamScore ?? fixture.Home?.Score ?? null;
    const fifaAwayScore = fixture.AwayTeamScore ?? fixture.Away?.Score ?? null;
    const fifaHomePenaltyScore = fixture.HomeTeamPenaltyScore ?? null;
    const fifaAwayPenaltyScore = fixture.AwayTeamPenaltyScore ?? null;

    const isFinal = await isFixtureCompletedFinal(db, fixture);
    championVotesResolved += await resolveChampionIfFinal(
      db,
      fixture,
      isFinal,
      tournamentId,
    );
    topScorerVotesResolved += await resolveTopScorerIfFinal(
      db,
      fixture,
      isFinal,
      topScorerAdapter,
      tournamentId,
    );

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
          tournamentId,
          homeCountry: fifaHome,
          awayCountry: fifaAway,
          homeCountryCode: fifaHomeCode,
          awayCountryCode: fifaAwayCode,
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
        homeCountry: fifaHome,
        awayCountry: fifaAway,
        homeCountryCode: fifaHomeCode,
        awayCountryCode: fifaAwayCode,
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
        homeCountry: patch.homeCountry,
        awayCountry: patch.awayCountry,
        homeCountryCode: patch.homeCountryCode,
        awayCountryCode: patch.awayCountryCode,
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

  const championCandidatesSynced = await syncChampionCandidates(
    db,
    tournamentId,
  );
  const topScorerCandidatesSynced = await syncTopScorerCandidates(
    db,
    topScorerAdapter,
    tournamentId,
  );

  return {
    fetched: fixtures.length,
    created,
    updated,
    unchanged,
    teamsUpdated,
    resolved,
    championCandidatesSynced,
    championVotesResolved,
    topScorerCandidatesSynced,
    topScorerVotesResolved,
  };
}
