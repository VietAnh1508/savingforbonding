import Link from "next/link";

import { LeaderboardTabs } from "~/app/_components/leaderboard-tabs";
import { Nav } from "~/app/_components/nav";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function LeaderboardPage() {
  const [global, beerPool, session] = await Promise.all([
    api.leaderboard.global(),
    api.leaderboard.totalBeerPool(),
    auth(),
  ]);

  if (session?.user) {
    await api.vote.getFollowing.prefetch();
  }

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Leaderboard</h1>
        <p className="mb-8 text-foreground/60">
          Who owes the most beer? Higher is more generous.
        </p>

        <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300">
          <span className="font-semibold">Ranking correction (Jun 24):</span> We found and fixed a bug where the handicap was being applied incorrectly for away teams in some matches — causing a few predictions to be marked wrong when they should have been correct, and vice versa. All results and beer counts have been recalculated.{" "}
          <Link href="https://github.com/VietAnh1508/savingforbonding/issues/21" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
            Technical details →
          </Link>
        </div>

        <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          <span className="font-semibold">Ranking updated:</span> tiebreaks now consider prediction accuracy (correct votes ÷ total voted).{" "}
          <Link href="/rules" className="underline underline-offset-2 hover:opacity-80">
            See the Rules page for details.
          </Link>
        </div>

        <LeaderboardTabs
          global={global}
          beerPool={beerPool}
          currentUserId={session?.user?.id}
        />
      </main>
    </HydrateClient>
  );
}
