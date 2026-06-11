import path from "node:path";

import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma";

/**
 * Prisma CLI resolves `file:./db.sqlite` relative to prisma/schema.prisma,
 * but Next.js resolves it relative to the project root. Point runtime at the
 * same file the CLI creates: prisma/db.sqlite
 */
function resolveDatabaseUrl(): string {
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

const createPrismaClient = () =>
  new PrismaClient({
    datasources: {
      db: { url: resolveDatabaseUrl() },
    },
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
