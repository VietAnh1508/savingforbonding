import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_API_KEY;

if (!url || !token) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_API_KEY in environment.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

try {
  await client.execute("SELECT 1");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("401")) {
    console.error(`Turso authentication failed (401).

TURSO_API_KEY must be a database auth token, not a Platform API token.

If you have a Platform API token in .env, move it to TURSO_PLATFORM_TOKEN, then run:

  npm run turso:db-token

Or create a token with the Turso CLI:

  turso db tokens create savingforbonding
`);
    process.exit(1);
  }

  console.error(`Turso connection failed: ${message}`);
  process.exit(1);
}

execSync("npx prisma db push", {
  stdio: "inherit",
  env: {
    ...process.env,
    PRISMA_USE_TURSO: "1",
  },
});
