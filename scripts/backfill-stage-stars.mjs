import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_API_KEY;

if (!url || !token) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_API_KEY in environment.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

// One-time migration: `Stage.starsAllocated` was just added as a NOT NULL
// column defaulting to 0, so every pre-existing stage row currently reads 0
// regardless of whether it's a knockout stage. Only knockout stages ever had
// a star budget under the old hardcoded STARS_BY_STAGE map, so seed those
// defaults in now. Guarded by `starsAllocated = 0` so it's a no-op once an
// admin has set real values (safe to re-run, but not meant to run forever).
const DEFAULT_STARS_BY_STAGE = {
  "Round of 32": 8,
  "Round of 16": 4,
  "Quarter-final": 2,
  "Semi-final": 1,
  "Play-off for third place": 1,
  Final: 1,
};

try {
  let totalUpdated = 0;
  for (const [name, stars] of Object.entries(DEFAULT_STARS_BY_STAGE)) {
    const result = await client.execute({
      sql: `UPDATE Stage SET starsAllocated = ? WHERE name = ? AND isKnockout = 1 AND starsAllocated = 0`,
      args: [stars, name],
    });
    totalUpdated += result.rowsAffected ?? 0;
  }

  console.log(`Backfilled starsAllocated on ${totalUpdated} stage row(s).`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("no such column: starsAllocated")) {
    console.warn("Stage.starsAllocated column not found; run prisma db push first.");
    process.exit(0);
  }

  console.error(`Backfill failed: ${message}`);
  process.exit(1);
}
