import { LeaderboardTabs } from "~/app/_components/leaderboard-tabs";
import { Nav } from "~/app/_components/nav";
import { api, HydrateClient } from "~/trpc/server";

export default async function LeaderboardPage() {
  const [global, weekly, beerPool] = await Promise.all([
    api.leaderboard.global(),
    api.leaderboard.weekly(),
    api.leaderboard.totalBeerPool(),
  ]);

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <Nav />
        <main className="container mx-auto max-w-3xl px-4 py-8">
          <h1 className="mb-2 text-3xl font-bold">Top Donator</h1>
          <p className="mb-8 text-white/60">
            Who owes the most beer? Higher is more generous.
          </p>

          <LeaderboardTabs weekly={weekly} global={global} beerPool={beerPool} />
        </main>
      </div>
    </HydrateClient>
  );
}
