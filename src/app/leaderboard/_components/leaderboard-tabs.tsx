"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AccuracyTable } from "~/app/leaderboard/_components/accuracy-table";
import { BeerAccumulationChart } from "~/app/leaderboard/_components/beer-accumulation-chart";
import { LeaderboardTable } from "~/app/leaderboard/_components/leaderboard-table";
import { api, type RouterOutputs } from "~/trpc/react";

type TabId = "allTime" | "accuracy" | "beerPool";

const TABS: { id: TabId; label: string }[] = [
  { id: "allTime", label: "Most Beers" },
  { id: "accuracy", label: "Best Predictors" },
  { id: "beerPool", label: "Total Beer Pool" },
];

export function LeaderboardTabs({
  global,
  beerPool,
  currentUserId,
}: {
  global: RouterOutputs["leaderboard"]["global"];
  beerPool: RouterOutputs["leaderboard"]["totalBeerPool"];
  currentUserId?: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("allTime");

  const { data: rankHistory } = api.leaderboard.rankByDay.useQuery();
  const rankGaps = useMemo(() => {
    const days = rankHistory?.days ?? [];
    if (days.length < 2) return {};
    const current = days[days.length - 1]!.ranks;
    const previous = days[days.length - 2]!.ranks;
    const gaps: Record<string, number> = {};
    for (const [userId, rank] of Object.entries(current)) {
      const prevRank = previous[userId];
      if (prevRank !== undefined) gaps[userId] = prevRank - rank;
    }
    return gaps;
  }, [rankHistory]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-foreground/10 bg-foreground/5 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "allTime" && (
        <>
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
                {global.lastUpdated.toLocaleString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <LeaderboardTable
            entries={global.entries}
            beersLabel="Total Beers"
            currentUserId={currentUserId}
            rankGaps={rankGaps}
          />
        </>
      )}

      {activeTab === "accuracy" && (
        <AccuracyTable entries={global.entries} currentUserId={currentUserId} />
      )}

      {activeTab === "beerPool" && (
        <>
          <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-10 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-foreground/50">
              Community Beer Pool
            </p>
            <p className="mt-4 text-6xl font-bold text-amber-600 dark:text-amber-400">
              🍺 {beerPool.totalBeers}
            </p>
            <p className="mt-3 text-lg text-foreground/80">
              beers pledged across the group
            </p>
          </div>
          <BeerAccumulationChart />
        </>
      )}
    </div>
  );
}

