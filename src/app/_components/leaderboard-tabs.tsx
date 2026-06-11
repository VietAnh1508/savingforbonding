"use client";

import { useState } from "react";

import { LeaderboardTable } from "~/app/_components/leaderboard-table";
import { formatBeers } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type TabId = "weekly" | "allTime" | "beerPool";

const TABS: { id: TabId; label: string }[] = [
  { id: "weekly", label: "This Week" },
  { id: "allTime", label: "All Time" },
  { id: "beerPool", label: "Total Beer Pool" },
];

export function LeaderboardTabs({
  weekly,
  global,
  beerPool,
}: {
  weekly: RouterOutputs["leaderboard"]["weekly"];
  global: RouterOutputs["leaderboard"]["global"];
  beerPool: RouterOutputs["leaderboard"]["totalBeerPool"];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("weekly");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "weekly" && (
        <LeaderboardTable entries={weekly} beersLabel="Weekly Beers" />
      )}

      {activeTab === "allTime" && (
        <LeaderboardTable entries={global} beersLabel="Total Beers" />
      )}

      {activeTab === "beerPool" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-white/50">
            Community Beer Pool
          </p>
          <p className="mt-4 text-6xl font-bold text-amber-400">
            🍺 {beerPool.totalBeers}
          </p>
          <p className="mt-3 text-lg text-white/80">
            {formatBeers(beerPool.totalBeers)} pledged across the group
          </p>
          <p className="mt-6 text-sm text-white/50">
            {beerPool.contributorCount} of {beerPool.userCount} player
            {beerPool.userCount === 1 ? "" : "s"} on the board
          </p>
        </div>
      )}
    </div>
  );
}
