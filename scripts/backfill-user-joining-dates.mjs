import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_API_KEY;

if (!url || !token) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_API_KEY in environment.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

try {
  const backfill = await client.execute(`
    UPDATE User
    SET createdAt = (
      SELECT MIN(createdAt)
      FROM Vote
      WHERE Vote.userId = User.id
    )
    WHERE EXISTS (
      SELECT 1
      FROM Vote
      WHERE Vote.userId = User.id
    )
  `);

  const result = await client.execute(`
    SELECT COUNT(*) AS count
    FROM User
    WHERE createdAt IS NOT NULL
  `);

  console.log(
    `Backfilled user joining dates (${backfill.rowsAffected ?? 0} updated). ${result.rows[0]?.count ?? 0} users have createdAt.`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("no such column: createdAt")) {
    console.warn("User.createdAt column not found; run prisma db push first.");
    process.exit(0);
  }

  console.error(`Backfill failed: ${message}`);
  process.exit(1);
}
