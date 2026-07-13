import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_API_KEY;

if (!url || !token) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_API_KEY in environment.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

// One-time migration: `Vote.starTier` replaces the boolean `Vote.hasStar`.
// Map existing starred votes to the yellow tier so history doesn't lose its
// star. Guarded by `starTier IS NULL` so it's safe to re-run.
try {
  const result = await client.execute(
    `UPDATE Vote SET starTier = 'YELLOW' WHERE hasStar = 1 AND starTier IS NULL`,
  );

  console.log(`Backfilled starTier on ${result.rowsAffected ?? 0} vote row(s).`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("no such column")) {
    console.warn("Vote.starTier column not found; run prisma db push first.");
    process.exit(0);
  }

  console.error(`Backfill failed: ${message}`);
  process.exit(1);
}
