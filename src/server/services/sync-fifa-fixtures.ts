import { getFifaCountryCode } from "~/lib/country-flag";
import { buildFifaMatchPatch } from "~/lib/fifa-sync";
import { deriveResult } from "~/lib/match";
import { resolveChampionVotes } from "~/server/services/champion-vote";
import { resolveTopScorerVotes } from "~/server/services/top-scorer-vote";
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
import {
  compareGoldenBoot,
  fetchTopScorers,
  type VnexpressTopScorer,
} from "~/server/services/vnexpress-api";
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
  scorer: VnexpressTopScorer,
) {
  return db.topScorerCandidate.upsert({
    where: { externalPlayerId: String(scorer.player_id) },
    create: {
      externalPlayerId: String(scorer.player_id),
      playerName: scorer.player_name,
      countryName: scorer.nationality,
      goals: scorer.goals.total,
      assists: scorer.goals.assists ?? 0,
      minutesPlayed: scorer.games.minutes_played,
    },
    update: {
      playerName: scorer.player_name,
      countryName: scorer.nationality,
      goals: scorer.goals.total,
      assists: scorer.goals.assists ?? 0,
      minutesPlayed: scorer.games.minutes_played,
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
): Promise<number> {
  if (!isFinal || !fixture.Winner) return 0;

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
  getTopScorers: () => Promise<VnexpressTopScorer[]>,
): Promise<number> {
  if (!isFinal) return 0;

  const scorers = await getTopScorers();
  if (!scorers.length) return 0;

  const [best, ...rest] = [...scorers].sort(compareGoldenBoot);
  const winners = [
    best!,
    ...rest.filter((s) => compareGoldenBoot(s, best!) === 0),
  ];

  const winnerCandidates = await Promise.all(
    winners.map((winner) => upsertTopScorerCandidate(db, winner)),
  );

  const { usersUpdated } = await resolveTopScorerVotes(
    db,
    winnerCandidates.map((c) => c.id),
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
  getTopScorers: () => Promise<VnexpressTopScorer[]>,
): Promise<number> {
  const semiFinalStage = await db.stage.findFirst({
    where: { name: "Semi-final" },
  });
  if (!semiFinalStage) return 0;

  const [scorers, qualifiedTeams] = await Promise.all([
    getTopScorers(),
    fetchQualifiedTeams(semiFinalStage.id),
  ]);

  const remainingCountryCodes = new Set(
    qualifiedTeams.map((team) => team.IdCountry),
  );
  const eligibleScorers = scorers.filter((scorer) => {
    const code = getFifaCountryCode(scorer.nationality);
    return code !== null && remainingCountryCodes.has(code);
  });

  const topScorers = eligibleScorers
    .sort(compareGoldenBoot)
    .slice(0, TOP_SCORER_CANDIDATE_COUNT);

  await Promise.all(
    topScorers.map((scorer) => upsertTopScorerCandidate(db, scorer)),
  );

  return topScorers.length;
}

async function syncChampionCandidates(db: PrismaClient): Promise<number> {
  const semiFinalStage = await db.stage.findFirst({
    where: { name: "Semi-final" },
  });
  if (!semiFinalStage) return 0;

  const qualifiedTeams = await fetchQualifiedTeams(semiFinalStage.id);

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

  // Shared across resolveTopScorerIfFinal (per-fixture) and syncTopScorerCandidates
  // (post-loop) so a Final-day sync fetches vnexpress standings once, not twice.
  let cachedTopScorers: Promise<VnexpressTopScorer[]> | null = null;
  const getTopScorers = () => (cachedTopScorers ??= fetchTopScorers());

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
    const fifaKickoff = parseFifaKickoffToUtc(fixture.Date);
    const tournament = fifaTournamentName(fixture);
    const stageId = fixture.IdStage;

    const fifaHomeScore = fixture.HomeTeamScore ?? fixture.Home?.Score ?? null;
    const fifaAwayScore = fixture.AwayTeamScore ?? fixture.Away?.Score ?? null;
    const fifaHomePenaltyScore = fixture.HomeTeamPenaltyScore ?? null;
    const fifaAwayPenaltyScore = fixture.AwayTeamPenaltyScore ?? null;

    const isFinal = await isFixtureCompletedFinal(db, fixture);
    championVotesResolved += await resolveChampionIfFinal(db, fixture, isFinal);
    topScorerVotesResolved += await resolveTopScorerIfFinal(
      db,
      fixture,
      isFinal,
      getTopScorers,
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
  const topScorerCandidatesSynced = await syncTopScorerCandidates(
    db,
    getTopScorers,
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
