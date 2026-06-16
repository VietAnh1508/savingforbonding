"use client";

import { useState } from "react";

import { MatchCard } from "~/app/_components/match-card";
import { formatMatchDate, toVietnamDatetimeLocal } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Match = RouterOutputs["match"]["listUpcoming"][number];

type TabId = "upcoming" | "completed";

function groupByDate(matches: Match[]) {
  const grouped = matches.reduce(
    (acc, match) => {
      const key = toVietnamDatetimeLocal(match.kickoffAt).slice(0, 10);
      acc[key] ??= [];
      acc[key].push(match);
      return acc;
    },
    {} as Record<string, Match[]>,
  );

  return Object.keys(grouped)
    .sort()
    .map((key) => ({ dateKey: key, matches: grouped[key]! }));
}

function MatchList({
  matches,
  emptyMessage,
  isSignedIn,
}: {
  matches: Match[];
  emptyMessage: string;
  isSignedIn: boolean;
}) {
  const groups = groupByDate(matches);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-lg text-white/60">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(({ dateKey, matches: dayMatches }) => (
        <section key={dateKey}>
          <h2 className="mb-4 text-xl font-semibold text-emerald-400">
            {formatMatchDate(dayMatches[0]!.kickoffAt)}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dayMatches.map((match) => (
              <MatchCard key={match.id} match={match} isSignedIn={isSignedIn} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function MatchTabs({ isSignedIn }: { isSignedIn: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>("upcoming");

  const { data: matches = [] } = api.match.listUpcoming.useQuery();

  const upcoming = matches.filter((m) =>
    ["SCHEDULED", "LIVE", "POSTPONED"].includes(m.status),
  );
  const completed = matches.filter((m) => m.status === "COMPLETED");

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
        <p className="text-lg text-white/60">No matches found.</p>
        <p className="mt-2 text-sm text-white/40">
          Run <code className="text-emerald-400">npm run sync:fifa</code> to
          pull the World Cup schedule from FIFA, or add matches in the{" "}
          <a href="/admin" className="text-emerald-400 hover:underline">
            admin page
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="flex items-baseline gap-3 text-3xl font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`transition ${activeTab === "upcoming" ? "text-white" : "text-white/30 hover:text-white/50"}`}
          >
            Upcoming
          </button>
          <span className="text-white/20">/</span>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`text-xl transition ${activeTab === "completed" ? "text-white" : "text-white/30 hover:text-white/50"}`}
          >
            Completed
            {completed.length > 0 && (
              <span className="ml-2 font-normal text-white/40">
                ({completed.length})
              </span>
            )}
          </button>
        </h1>
        <p className="mt-2 text-white/60">
          Predict World Cup outcomes — win or lose, you owe beer
        </p>
      </div>

      {activeTab === "upcoming" && (
        <MatchList
          matches={upcoming}
          emptyMessage="No upcoming matches found."
          isSignedIn={isSignedIn}
        />
      )}
      {activeTab === "completed" && (
        <MatchList
          matches={completed}
          emptyMessage="No completed matches yet."
          isSignedIn={isSignedIn}
        />
      )}
    </div>
  );
}
