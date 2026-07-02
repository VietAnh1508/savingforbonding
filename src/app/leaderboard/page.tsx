import { Nav } from "~/app/_components/nav";
import { LeaderboardTabs } from "~/app/leaderboard/_components/leaderboard-tabs";
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

        <LeaderboardTabs
          global={global}
          beerPool={beerPool}
          currentUserId={session?.user?.id}
        />
      </main>
    </HydrateClient>
  );
}
