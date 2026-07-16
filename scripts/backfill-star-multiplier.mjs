import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_API_KEY;

if (!url || !token) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_API_KEY in environment.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

// One-time migration: `Vote.starMultiplier` / `ChampionVote.starMultiplier`
// replace the fixed-tier `starTier` enum (YELLOW/RED/PURPLE -> 2x/4x/8x), and
// `Stage.maxStarMultiplier` replaces `Stage.isRedStarStartStage`. Guarded so
// it's safe to re-run: only touches rows still at their default (null / 0).
try {
  const voteResult = await client.execute(`
    UPDATE Vote
    SET starMultiplier = CASE starTier
      WHEN 'YELLOW' THEN 2
      WHEN 'RED' THEN 4
      WHEN 'PURPLE' THEN 8
    END
    WHERE starTier IS NOT NULL AND starMultiplier IS NULL
  `);
  console.log(`Backfilled starMultiplier on ${voteResult.rowsAffected ?? 0} vote row(s).`);

  const championResult = await client.execute(`
    UPDATE ChampionVote
    SET starMultiplier = CASE starTier
      WHEN 'YELLOW' THEN 2
      WHEN 'RED' THEN 4
    END
    WHERE starTier IS NOT NULL AND starMultiplier IS NULL
  `);
  console.log(`Backfilled starMultiplier on ${championResult.rowsAffected ?? 0} champion vote row(s).`);

  // The old red/purple gate applied to every stage from the flagged
  // threshold stage onward by sequenceOrder, not just the flagged stage
  // itself (mirrors the old isRedStarEligibleStage comparison).
  const flagged = await client.execute(
    `SELECT sequenceOrder FROM Stage WHERE isRedStarStartStage = 1 LIMIT 1`,
  );
  const flaggedOrder = flagged.rows[0]?.sequenceOrder;

  let redPurpleResult = { rowsAffected: 0 };
  if (flaggedOrder !== undefined) {
    redPurpleResult = await client.execute({
      sql: `UPDATE Stage SET maxStarMultiplier = 8 WHERE sequenceOrder >= ? AND maxStarMultiplier = 0`,
      args: [flaggedOrder],
    });
  }
  console.log(
    `Set maxStarMultiplier = 8 on ${redPurpleResult.rowsAffected ?? 0} stage row(s) at/after sequenceOrder ${flaggedOrder ?? "n/a"}.`,
  );

  const yellowResult = await client.execute(`
    UPDATE Stage SET maxStarMultiplier = 2 WHERE starsAllocated > 0 AND maxStarMultiplier = 0
  `);
  console.log(`Set maxStarMultiplier = 2 on ${yellowResult.rowsAffected ?? 0} stage row(s).`);

  const [voteSample, stageSample] = await Promise.all([
    client.execute(
      `SELECT id, starTier, starMultiplier FROM Vote WHERE starTier IS NOT NULL LIMIT 5`,
    ),
    client.execute(
      `SELECT name, sequenceOrder, starsAllocated, isRedStarStartStage, maxStarMultiplier FROM Stage ORDER BY sequenceOrder`,
    ),
  ]);
  console.log("Sample votes:", JSON.stringify(voteSample.rows));
  console.log("All stages:", JSON.stringify(stageSample.rows));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("no such column")) {
    console.warn("starMultiplier/maxStarMultiplier column not found; run prisma db push first.");
    process.exit(0);
  }

  console.error(`Backfill failed: ${message}`);
  process.exit(1);
}
