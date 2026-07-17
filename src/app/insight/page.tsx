import { Nav } from "~/app/_components/nav";
import { TAB_IDS, type TabId } from "~/app/insight/_components/insight-tab-ids";
import { InsightTabs } from "~/app/insight/_components/insight-tabs";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function InsightPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [global, , , session, { tab }] = await Promise.all([
    api.leaderboard.global(),
    api.leaderboard.rankByDay.prefetch(),
    api.leaderboard.starEfficiency.prefetch(),
    auth(),
    searchParams,
  ]);

  const initialTab: TabId = (TAB_IDS as string[]).includes(tab ?? "")
    ? (tab as TabId)
    : "accuracy";

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Insight</h1>
        <p className="mb-6 text-foreground/60">
          Deeper stats: prediction accuracy, rank changes, and beer accumulation
          over time.
        </p>
        <InsightTabs
          global={global}
          currentUserId={session?.user?.id}
          initialTab={initialTab}
        />
      </main>
    </HydrateClient>
  );
}
