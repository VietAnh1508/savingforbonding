import Link from "next/link";

import { Nav } from "~/app/_components/nav";
import { LeaderboardTable } from "~/app/leaderboard/_components/leaderboard-table";
import { SpinButtonSection } from "~/app/leaderboard/_components/spin-button-section";
import { formatBeerAmount } from "~/lib/beer-amount-spin";
import { formatShortDateTime } from "~/lib/datetime";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function LeaderboardPage() {
  const [global, beerPool, , spinStatus, session] = await Promise.all([
    api.leaderboard.global(),
    api.leaderboard.totalBeerPool(),
    api.leaderboard.rankByDay.prefetch(),
    api.beerAmountSpin.getStatus(),
    auth(),
  ]);

  if (session?.user) {
    await Promise.all([
      api.vote.getFollowing.prefetch(),
      api.beerAmountSpin.getMySpin.prefetch(),
    ]);
  }

  // Real beer-pool total: sum of each spinner's own beers × their own spun
  // amount, not the pool's average amount applied across every player —
  // non-spinners (amount === null) don't have a priced amount to include.
  const beerTotal = global.entries.reduce(
    (sum, entry) =>
      entry.amount !== null ? sum + entry.beers * entry.amount : sum,
    0,
  );

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

          {spinStatus.enabled &&
            (beerPool.spinnerCount > 0 ? (
              <div className="mt-2 space-y-1 text-sm text-foreground/60">
                <p>
                  Avg. {formatBeerAmount(beerPool.averageAmount!)}/beer across{" "}
                  {beerPool.spinnerCount} spinner
                  {beerPool.spinnerCount === 1 ? "" : "s"} →{" "}
                  <span className="font-semibold text-foreground">
                    {formatBeerAmount(beerPool.finalAmount!)} total
                  </span>
                </p>
                <p>
                  Absolute amount (beers × individual price) →{" "}
                  <span className="font-semibold text-foreground">
                    {formatBeerAmount(beerTotal)} total
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-foreground/40">
                No one has spun the wheel yet — amount TBD.
              </p>
            ))}

          {session?.user && (
            <div className="mt-5">
              <SpinButtonSection />
            </div>
          )}
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
              {formatShortDateTime(global.lastUpdated)}
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
