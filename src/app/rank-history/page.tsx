import { BackLink } from "~/app/_components/back-link";
import { Nav } from "~/app/_components/nav";
import { RankHistoryChart } from "~/app/leaderboard/_components/rank-history-chart";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function RankHistoryPage() {
  const [, session] = await Promise.all([
    api.leaderboard.rankByDay.prefetch(),
    auth(),
  ]);

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-2">
          <BackLink href="/leaderboard" label="Leaderboard" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Rank History</h1>
        <p className="mb-6 text-foreground/60">
          How rankings changed day by day. Rank 1 is at the top.
        </p>
        <RankHistoryChart currentUserId={session?.user?.id} />
      </main>
    </HydrateClient>
  );
}
