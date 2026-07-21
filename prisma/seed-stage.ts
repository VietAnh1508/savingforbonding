import { BEER_LOSE, BEER_NO_VOTE } from "../src/lib/match";
import { createPrismaClient } from "../src/server/create-prisma-client";
import { getActiveTournamentId } from "../src/server/services/active-tournament";
import { fetchStages } from "../src/server/services/fifa-api";

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
  const [stages, tournamentId] = await Promise.all([
    fetchStages(),
    getActiveTournamentId(db),
  ]);

  for (const stage of stages) {
    const name = stage.Name.find((n) => n.Locale === "en-GB")?.Description ?? stage.Name[0]!.Description;
    await db.stage.upsert({
      where: { id: stage.IdStage },
      update: {
        name,
        startDate: new Date(stage.StartDate),
        endDate: new Date(stage.EndDate),
        sequenceOrder: stage.SequenceOrder,
        tournamentId,
        isKnockout: stage.Type === 0,
      },
      create: {
        id: stage.IdStage,
        name,
        startDate: new Date(stage.StartDate),
        endDate: new Date(stage.EndDate),
        sequenceOrder: stage.SequenceOrder,
        tournamentId,
        isKnockout: stage.Type === 0,
        starsAllocated: STARS_BY_STAGE[name] ?? 0,
      },
    });

    const isKnockout = stage.Type === 0;
    const wrongPenalty = isKnockout
      ? BEER_LOSE + (stage.SequenceOrder - 1) * 3
      : BEER_LOSE;
    const noVotePenalty = isKnockout ? wrongPenalty + 2 : BEER_NO_VOTE;

    await db.stagePenalty.upsert({
      where: { stageId: stage.IdStage },
      update: {}, // never clobber an admin's edited values on re-seed
      create: { stageId: stage.IdStage, wrongPenalty, noVotePenalty },
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
