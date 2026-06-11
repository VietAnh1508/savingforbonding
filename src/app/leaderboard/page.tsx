import { LeaderboardTable } from "~/app/_components/leaderboard-table";
import { Nav } from "~/app/_components/nav";
import { api, HydrateClient } from "~/trpc/server";

export default async function LeaderboardPage() {
  const [global, weekly] = await Promise.all([
    api.leaderboard.global(),
    api.leaderboard.weekly(),
  ]);

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <Nav />
        <main className="container mx-auto max-w-3xl px-4 py-8">
          <h1 className="mb-8 text-3xl font-bold">Leaderboard</h1>

          <div className="space-y-12">
            <section>
              <h2 className="mb-4 text-xl font-semibold text-emerald-400">
                This Week
              </h2>
              <LeaderboardTable
                entries={weekly}
                pointsLabel="Weekly Points"
              />
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-emerald-400">
                All Time
              </h2>
              <LeaderboardTable
                entries={global}
                pointsLabel="Total Points"
              />
            </section>
          </div>
        </main>
      </div>
    </HydrateClient>
  );
}
