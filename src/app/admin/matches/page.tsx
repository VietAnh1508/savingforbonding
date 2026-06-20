import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BackLink } from "~/app/admin/_components/back-link";
import { MatchesPanel } from "~/app/admin/_components/matches-panel";
import { ADMIN_COOKIE } from "~/lib/admin";
import { HydrateClient } from "~/trpc/server";

export default async function MatchesPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== "1") redirect("/admin");

  return (
    <HydrateClient>
      <div className="space-y-6">
        <BackLink href="/admin" />
        <MatchesPanel />
      </div>
    </HydrateClient>
  );
}
