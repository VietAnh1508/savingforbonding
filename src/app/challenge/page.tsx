import { redirect } from "next/navigation";

import { Nav } from "~/app/_components/nav";
import { ChallengePageClient } from "~/app/challenge/_components/challenge-page-client";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function ChallengePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  await api.challenge.listMine.prefetch();

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Challenge</h1>
        <p className="mb-6 text-foreground/60">
          Transfer beers on a specific outcome with a friend.
        </p>
        <ChallengePageClient currentUserId={session.user.id} />
      </main>
    </HydrateClient>
  );
}
