"use client";

import { useState } from "react";

import { AccuracyTable } from "~/app/insight/_components/accuracy-table";
import { BeerAccumulationChart } from "~/app/insight/_components/beer-accumulation-chart";
import { BiggestMoverCard } from "~/app/insight/_components/biggest-mover-card";
import { MostFollowedCard } from "~/app/insight/_components/most-followed-card";
import { RankHistoryChart } from "~/app/insight/_components/rank-history-chart";
import { type RouterOutputs } from "~/trpc/react";

type TabId = "accuracy" | "rankHistory" | "beerPool" | "mostFollowed";

const TABS: { id: TabId; label: string }[] = [
  { id: "accuracy", label: "Best Predictors" },
  { id: "rankHistory", label: "Rank History" },
  { id: "beerPool", label: "Beer Pool" },
  { id: "mostFollowed", label: "Most Followed" },
];

export function InsightTabs({
  global,
  currentUserId,
}: {
  global: RouterOutputs["leaderboard"]["global"];
  currentUserId?: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("accuracy");

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

      {activeTab === "accuracy" && (
        <AccuracyTable entries={global.entries} currentUserId={currentUserId} />
      )}

      {activeTab === "rankHistory" && (
        <>
          <BiggestMoverCard />
          <RankHistoryChart currentUserId={currentUserId} />
        </>
      )}

      {activeTab === "beerPool" && <BeerAccumulationChart />}

      {activeTab === "mostFollowed" && <MostFollowedCard />}
    </div>
  );
}
