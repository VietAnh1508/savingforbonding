"use client";

import Link from "next/link";
import { useState } from "react";

import { AccuracyTable } from "~/app/_components/accuracy-table";
import { BeerAccumulationChart } from "~/app/_components/beer-accumulation-chart";
import { LeaderboardTable } from "~/app/_components/leaderboard-table";
import { type RouterOutputs } from "~/trpc/react";

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
          {currentUserId && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Copying vote has been moved to{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("accuracy")}
                  className="font-semibold underline underline-offset-2 hover:no-underline"
                >
                  Best Predictors
                </button>
              </span>
            </div>
          )}
          <LeaderboardTable
            entries={global.entries}
            beersLabel="Total Beers"
            currentUserId={currentUserId}
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

