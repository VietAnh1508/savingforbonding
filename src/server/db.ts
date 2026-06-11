import "server-only";

import fs from "node:fs";
import path from "node:path";

import { env } from "~/env";
import { createPrismaClient } from "~/server/create-prisma-client";
import { logDatabaseInit } from "~/server/db-diagnostics";

function getGeneratedClientMtime() {
  try {
    return fs.statSync(
      path.join(process.cwd(), "generated/prisma/index.js"),
    ).mtimeMs;
  } catch {
    return 0;
  }
}

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

export { createPrismaClient } from "~/server/create-prisma-client";
