import { createClient } from "@libsql/client";

const platformToken = process.env.TURSO_PLATFORM_TOKEN;
const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!platformToken) {
  console.error(
    "Missing TURSO_PLATFORM_TOKEN. Use the Platform API token from the Turso dashboard.",
  );
  process.exit(1);
}

if (!databaseUrl?.startsWith("libsql://")) {
  console.error("Missing or invalid TURSO_DATABASE_URL.");
  process.exit(1);
}

const hostname = new URL(databaseUrl).hostname;
const [dbAndOrg] = hostname.split(".");
if (!dbAndOrg) {
  console.error("Could not parse org/database from TURSO_DATABASE_URL.");
  process.exit(1);
}

const dashIndex = dbAndOrg.lastIndexOf("-");
if (dashIndex === -1) {
  console.error(
    "Could not parse org/database from TURSO_DATABASE_URL hostname.",
  );
  process.exit(1);
}

const databaseName = dbAndOrg.slice(0, dashIndex);
const organization = dbAndOrg.slice(dashIndex + 1);

const response = await fetch(
  `https://api.turso.tech/v1/organizations/${organization}/databases/${databaseName}/auth/tokens`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${platformToken}`,
      "Content-Type": "application/json",
    },
  },
);

if (!response.ok) {
  const body = await response.text();
  console.error(
    `Failed to create database token (${response.status}): ${body}`,
  );
  process.exit(1);
}

const { jwt } = await response.json();

console.log(`Database: ${databaseName}`);
console.log(`Organization: ${organization}`);
console.log("");
console.log("Add this to your .env as TURSO_API_KEY:");
console.log(`TURSO_API_KEY="${jwt}"`);
