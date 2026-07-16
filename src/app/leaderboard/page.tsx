import Link from "next/link";

import { Nav } from "~/app/_components/nav";
import { LeaderboardTable } from "~/app/leaderboard/_components/leaderboard-table";
import { MATCH_DISPLAY_TIMEZONE } from "~/lib/match";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function LeaderboardPage() {
  const [global, beerPool, , session] = await Promise.all([
    api.leaderboard.global(),
    api.leaderboard.totalBeerPool(),
    api.leaderboard.rankByDay.prefetch(),
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

        <div className="mb-6 rounded-xl border border-foreground/10 bg-foreground/5 p-10 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-foreground/50">
            Community Beer Pool
          </p>
          <p className="mt-4 text-6xl font-bold text-amber-600 dark:text-amber-400">
            🍺 {beerPool.totalBeers}
          </p>
          <p className="mt-3 text-lg text-foreground/80">
            beers pledged across {beerPool.userCount} players
          </p>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs">
          <Link
            href="/rules"
            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Tie-breaker rules →
          </Link>
          {global.lastUpdated && (
            <span className="text-foreground/40">
              Last updated:{" "}
              {global.lastUpdated.toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: MATCH_DISPLAY_TIMEZONE,
              })}
            </span>
          )}
        </div>

        <LeaderboardTable
          entries={global.entries}
          beersLabel="Total Beers"
          currentUserId={session?.user?.id}
        />
      </main>
    </HydrateClient>
  );
}
