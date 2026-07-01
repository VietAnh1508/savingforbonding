import { createPrismaClient } from "../src/server/create-prisma-client";
import stagesData from "../stages.json";

const db = createPrismaClient();

async function main() {
  for (const stage of stagesData.Results) {
    const name = stage.Name.find((n) => n.Locale === "en-GB")?.Description ?? stage.Name[0]!.Description;
    await db.stage.upsert({
      where: { id: stage.IdStage },
      update: {
        name,
        startDate: new Date(stage.StartDate),
        endDate: new Date(stage.EndDate),
        sequenceOrder: stage.SequenceOrder,
        seasonId: stage.IdSeason,
        isKnockout: stage.Type === 0,
      },
      create: {
        id: stage.IdStage,
        name,
        startDate: new Date(stage.StartDate),
        endDate: new Date(stage.EndDate),
        sequenceOrder: stage.SequenceOrder,
        seasonId: stage.IdSeason,
        isKnockout: stage.Type === 0,
      },
    });
    console.log(`Upserted stage: ${name} (knockout: ${stage.Type === 0})`);
  }
  console.log(`Done — ${stagesData.Results.length} stages processed.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
