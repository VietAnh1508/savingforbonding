import { MatchTabs } from "~/app/_components/match-tabs";
import { Nav } from "~/app/_components/nav";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const [session] = await Promise.all([
    auth(),
    api.match.listUpcoming.prefetch(),
  ]);

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <Nav />
        <main className="container mx-auto px-4 py-8">
          <MatchTabs isSignedIn={!!session?.user} />
        </main>
      </div>
    </HydrateClient>
  );
}
