import "server-only";

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

import { env } from "~/env";
import { logDatabaseInit } from "~/server/db-diagnostics";
import { PrismaClient, type Prisma } from "../../generated/prisma";

const require = createRequire(import.meta.url);

function getGeneratedClientMtime() {
  try {
    return fs.statSync(
      path.join(process.cwd(), "generated/prisma/index.js"),
    ).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Prisma CLI resolves `file:./db.sqlite` relative to prisma/schema.prisma,
 * but Next.js resolves it relative to the project root. Point runtime at the
 * same file the CLI creates: prisma/db.sqlite
 */
function resolveLocalDatabaseUrl(): string {
  const url = env.DATABASE_URL;
  if (!url.startsWith("file:")) return url;

  const filePath = url.replace(/^file:/, "");
  if (path.isAbsolute(filePath)) return url;

  const normalized = filePath.replace(/^\.\//, "");
  if (normalized === "db.sqlite") {
    return `file:${path.join(process.cwd(), "prisma", "db.sqlite")}`;
  }

  return `file:${path.join(process.cwd(), normalized)}`;
}

function useTurso(): boolean {
  return Boolean(env.TURSO_DATABASE_URL && env.TURSO_API_KEY);
}

function createTursoClient(log: Prisma.LogLevel[]) {
  const { PrismaLibSQL } =
    require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");

  const adapter = new PrismaLibSQL({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_API_KEY!,
  });

  return new PrismaClient({ adapter, log });
}

export const createPrismaClient = () => {
  const log: Prisma.LogLevel[] =
    env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"];

  if (useTurso()) {
    return createTursoClient(log);
  }

  return new PrismaClient({
    datasources: {
      db: { url: resolveLocalDatabaseUrl() },
    },
    log,
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  prismaMtime: number | undefined;
};

const generatedClientMtime = getGeneratedClientMtime();

if (
  env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaMtime !== generatedClientMtime
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

const prismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV === "production") {
  logDatabaseInit();
}

export const db = prismaClient;

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaMtime = generatedClientMtime;
}
