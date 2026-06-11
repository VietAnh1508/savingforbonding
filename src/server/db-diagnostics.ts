import "server-only";

import { env } from "~/env";

export type DatabaseMode = "turso" | "local-sqlite";

export function getDatabaseMode(): DatabaseMode {
  return env.TURSO_DATABASE_URL && env.TURSO_API_KEY
    ? "turso"
    : "local-sqlite";
}

function parseTursoHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Safe snapshot for logs — never includes tokens or full connection strings. */
export function describeDatabaseConfig() {
  const mode = getDatabaseMode();
  const tursoUrl = env.TURSO_DATABASE_URL;

  return {
    mode,
    nodeEnv: env.NODE_ENV,
    tursoHost: tursoUrl ? parseTursoHost(tursoUrl) : null,
    tursoUrlSet: Boolean(tursoUrl),
    tursoApiKeySet: Boolean(env.TURSO_API_KEY),
    tursoApiKeyLength: env.TURSO_API_KEY?.length ?? 0,
    tursoUrlHasEmbeddedToken: tursoUrl?.includes("authToken") ?? false,
    databaseUrlScheme: env.DATABASE_URL.split(":")[0] ?? "unknown",
    partialTursoConfig:
      Boolean(tursoUrl) !== Boolean(env.TURSO_API_KEY),
  };
}

export function describeDatabaseError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!message) return null;

  if (message.includes("401")) {
    return {
      kind: "turso-auth-failed" as const,
      hint:
        "TURSO_API_KEY is missing, expired, or is a Platform API token. Use a database auth token from `npm run turso:db-token`.",
    };
  }

  if (message.includes("404") || message.includes("not found")) {
    return {
      kind: "turso-not-found" as const,
      hint: "TURSO_DATABASE_URL may be wrong or the database was deleted.",
    };
  }

  if (message.includes("ConnectorError") || message.includes("SqliteError")) {
    return {
      kind: "database-connector-error" as const,
      hint: "Check Turso credentials and that the schema was pushed (`npm run db:push:turso`).",
    };
  }

  return null;
}

export function logDatabaseInit() {
  const config = describeDatabaseConfig();

  console.info("[DB] Prisma client initialized", config);

  if (config.partialTursoConfig) {
    console.warn(
      "[DB] Partial Turso config: set both TURSO_DATABASE_URL and TURSO_API_KEY, or neither.",
      {
        tursoUrlSet: config.tursoUrlSet,
        tursoApiKeySet: config.tursoApiKeySet,
      },
    );
  }

  if (config.mode === "turso" && config.tursoUrlHasEmbeddedToken) {
    console.warn(
      "[DB] TURSO_DATABASE_URL contains authToken query param. Pass the token via TURSO_API_KEY only.",
    );
  }
}

export function logDatabaseQueryError(operation: string, error: unknown) {
  const config = describeDatabaseConfig();
  const dbError = describeDatabaseError(error);
  const message = error instanceof Error ? error.message : String(error);

  console.error("[DB] Query failed", {
    operation,
    message,
    database: config,
    ...(dbError ? { databaseError: dbError } : {}),
  });
}
