import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MatchesPanel } from "~/app/admin/_components/matches-panel";
import { ADMIN_COOKIE } from "~/lib/admin";
import { HydrateClient } from "~/trpc/server";

export default async function MatchesPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== "1") redirect("/admin");

  return (
    <HydrateClient>
      <div className="space-y-6">
        <Link
          href="/admin"
          className="text-sm text-foreground/50 transition hover:text-foreground/80"
        >
          ← Back
        </Link>
        <MatchesPanel />
      </div>
    </HydrateClient>
  );
}
