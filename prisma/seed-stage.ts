import { BEER_LOSE, BEER_NO_VOTE } from "../src/lib/match";
import { createPrismaClient } from "../src/server/create-prisma-client";
import { getActiveTournament } from "../src/server/services/active-tournament";
import { createFixtureSourceAdapter } from "../src/server/services/adapters/fixture-source-factory";

const db = createPrismaClient();

/** Default star allocations for new stages — after initial seeding, values live in `Stage.starsAllocated` and are admin-editable. */
const STARS_BY_STAGE: Record<string, number> = {
  "Round of 32": 8,
  "Round of 16": 4,
  "Quarter-final": 2,
  "Semi-final": 1,
  "Play-off for third place": 1,
  Final: 1,
};

async function main() {
  const tournament = await getActiveTournament(db);
  const fixtureAdapter = createFixtureSourceAdapter(tournament.dataSourceKey);
  const stages = await fixtureAdapter.fetchStages();
  const tournamentId = tournament.id;

  for (const stage of stages) {
    const { externalId: id, name, startDate, endDate, sequenceOrder, isKnockout } = stage;
    await db.stage.upsert({
      where: { id },
      update: {
        name,
        startDate,
        endDate,
        sequenceOrder,
        tournamentId,
        isKnockout,
      },
      create: {
        id,
        name,
        startDate,
        endDate,
        sequenceOrder,
        tournamentId,
        isKnockout,
        starsAllocated: STARS_BY_STAGE[name] ?? 0,
      },
    });

    const wrongPenalty = isKnockout
      ? BEER_LOSE + (sequenceOrder - 1) * 3
      : BEER_LOSE;
    const noVotePenalty = isKnockout ? wrongPenalty + 2 : BEER_NO_VOTE;

    await db.stagePenalty.upsert({
      where: { stageId: id },
      update: {}, // never clobber an admin's edited values on re-seed
      create: { stageId: id, wrongPenalty, noVotePenalty },
    });

    console.log(`Upserted stage: ${name} (knockout: ${isKnockout})`);
  }
  console.log(`Done — ${stages.length} stages processed.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
