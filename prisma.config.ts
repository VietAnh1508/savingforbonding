import { defineConfig } from "prisma/config";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoKey = process.env.TURSO_API_KEY;
const useTurso =
  process.env.PRISMA_USE_TURSO === "1" && Boolean(tursoUrl && tursoKey);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  ...(useTurso
    ? {
        experimental: {
          adapter: true,
        },
        engine: "js" as const,
        adapter: async () =>
          new PrismaLibSQL({
            url: tursoUrl!,
            authToken: tursoKey!,
          }),
      }
    : {
        engine: "classic" as const,
        datasource: {
          url: process.env.DATABASE_URL ?? "file:./db.sqlite",
        },
      }),
});
