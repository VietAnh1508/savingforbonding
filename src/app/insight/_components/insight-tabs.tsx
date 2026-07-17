"use client";

import { useEffect, useState } from "react";

import { AccuracyChart } from "~/app/insight/_components/accuracy-chart";
import { BeerAccumulationChart } from "~/app/insight/_components/beer-accumulation-chart";
import { BiggestMoverCard } from "~/app/insight/_components/biggest-mover-card";
import {
  TAB_IDS,
  TABS,
  type TabId,
} from "~/app/insight/_components/insight-tab-ids";
import { MostFollowedCard } from "~/app/insight/_components/most-followed-card";
import { RankHistoryChart } from "~/app/insight/_components/rank-history-chart";
import { StarEfficiencyPanel } from "~/app/insight/_components/star-efficiency-panel";
import { type RouterOutputs } from "~/trpc/react";

function readTabFromLocation(): TabId {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return (TAB_IDS as string[]).includes(tab ?? "")
    ? (tab as TabId)
    : "accuracy";
}

export function InsightTabs({
  global,
  currentUserId,
  initialTab,
}: {
  global: RouterOutputs["leaderboard"]["global"];
  currentUserId?: string;
  initialTab: TabId;
}) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const onPopState = () => setActiveTab(readTabFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectTab = (id: TabId) => {
    history.pushState(null, "", `/insight?tab=${id}`);
    setActiveTab(id);
  };

  return (
    <div className="md:flex md:items-start md:gap-8">
      <nav className="mb-6 hidden shrink-0 flex-col gap-1 md:mb-0 md:flex md:w-48">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        {activeTab === "accuracy" && (
          <AccuracyChart
            entries={global.entries}
            currentUserId={currentUserId}
          />
        )}

        {activeTab === "rankHistory" && (
          <>
            <BiggestMoverCard />
            <RankHistoryChart currentUserId={currentUserId} />
          </>
        )}

        {activeTab === "beerPool" && <BeerAccumulationChart />}

        {activeTab === "mostFollowed" && <MostFollowedCard />}

        {activeTab === "starEfficiency" && (
          <StarEfficiencyPanel currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
