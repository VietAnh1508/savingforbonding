import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "~/lib/admin";
import { db } from "~/server/db";
import { syncFifaFixtures } from "~/server/services/sync-fifa-fixtures";

export async function POST(request: Request) {
  if (!isAdminAuthenticated(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const result = await syncFifaFixtures(db);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin FIFA sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
