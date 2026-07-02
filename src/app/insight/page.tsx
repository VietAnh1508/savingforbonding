import { Nav } from "~/app/_components/nav";
import { InsightTabs } from "~/app/insight/_components/insight-tabs";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function InsightPage() {
  const [global, , session] = await Promise.all([
    api.leaderboard.global(),
    api.leaderboard.rankByDay.prefetch(),
    auth(),
  ]);

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Insight</h1>
        <p className="mb-6 text-foreground/60">
          Deeper stats: prediction accuracy, rank changes, and beer
          accumulation over time.
        </p>
        <InsightTabs global={global} currentUserId={session?.user?.id} />
      </main>
    </HydrateClient>
  );
}
