import { MatchTabs } from "~/app/_components/match-tabs";
import { Nav } from "~/app/_components/nav";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const [session] = await Promise.all([
    auth(),
    api.match.listMatches.prefetch({}),
  ]);

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto px-4 pb-8">
        <MatchTabs isSignedIn={!!session?.user} />
      </main>
    </HydrateClient>
  );
}
