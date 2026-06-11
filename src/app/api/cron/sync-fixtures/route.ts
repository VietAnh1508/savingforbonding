import { NextResponse } from "next/server";

import { env } from "~/env";
import { db } from "~/server/db";
import { syncFifaFixtures } from "~/server/services/sync-fifa-fixtures";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (env.CRON_SECRET && token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncFifaFixtures(db);
    return NextResponse.json(result);
  } catch (error) {
    console.error("FIFA fixture sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
