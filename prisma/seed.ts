import { createPrismaClient } from "../src/server/create-prisma-client";
import { syncFifaFixtures } from "../src/server/services/sync-fifa-fixtures";

const db = createPrismaClient();

async function main() {
  const result = await syncFifaFixtures(db);

  console.log(
    `Synced ${result.fetched} FIFA World Cup fixtures (${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged, ${result.teamsUpdated} teams updated, ${result.resolved} resolved).`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
