"use client";

import Image from "next/image";

import { RankGapBadge } from "~/app/leaderboard/_components/rank-gap-badge";
import { formatJoiningDate } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

import {
  formatAccuracy,
  RANK_BADGE_CLASSES,
} from "~/lib/leaderboard-constants";

type Entry = RouterOutputs["leaderboard"]["global"]["entries"][number];

const RANK_TITLES: Record<number, string> = {
  1: "The Hand of God",
  2: "National Prider",
  3: "Doctor of Prediction",
};

function titleForRank(rank: number): string | null {
  return RANK_TITLES[rank] ?? null;
}

export function LeaderboardTable({
  entries,
  beersLabel = "Beers",
  currentUserId,
  rankGaps,
}: {
  entries: Entry[];
  beersLabel?: string;
  currentUserId?: string;
  rankGaps?: Record<string, number>;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-8 text-center text-foreground/50">
        No registered users yet.
      </div>
    );
  }

  const rankOrder = [...new Set(entries.map((e) => e.rank))]
    .sort((a, b) => a - b)
    .reduce<Record<number, number>>((acc, rank, i) => {
      acc[rank] = i + 1;
      return acc;
    }, {});

  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10">
      <table className="w-full">
        <thead>
          <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-sm text-foreground/60">
            <th className="px-1 py-3 text-center font-medium sm:px-2">Rank</th>
            <th className="px-1 py-3 font-medium sm:px-2">Player</th>
            <th className="w-px whitespace-nowrap px-4 py-3 text-right font-medium">
              {beersLabel}
            </th>
            <th className="hidden w-px whitespace-nowrap px-4 py-3 font-medium sm:table-cell">
              Joining Date
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isCurrentUser = !!currentUserId && entry.id === currentUserId;
            const title = titleForRank(rankOrder[entry.rank] ?? 0);

            return (
              <tr
                key={entry.id}
                className={`border-b border-foreground/5 transition ${
                  isCurrentUser
                    ? "border-l-2 border-l-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15"
                    : "hover:bg-foreground/5"
                }`}
              >
                <td className="px-1 py-3 sm:px-2">
                  <div className="flex items-center justify-center">
                    <span className="flex w-7 shrink-0 justify-end pr-1">
                      <RankGapBadge gap={rankGaps?.[entry.id]} />
                    </span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold text-foreground/60">
                      {entry.rank}
                    </span>
                  </div>
                </td>
                <td className="px-1 py-3 sm:px-2">
                  <div className="flex items-center gap-3">
                    {entry.image ? (
                      <Image
                        src={entry.image}
                        alt={entry.name ?? "User"}
                        width={32}
                        height={32}
                        className="shrink-0 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm">
                        {[...(entry.name ?? "?")][0]}
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {entry.name ?? "Anonymous"}
                      </span>
                      {title && (
                        <span
                          className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${RANK_BADGE_CLASSES[rankOrder[entry.rank] ?? 0]}`}
                        >
                          {title}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                  <div className="flex items-center justify-end">
                    <span
                      className="group relative inline-block cursor-help outline-none"
                      tabIndex={0}
                    >
                      {entry.beers}
                      <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-normal text-white shadow-lg ring-1 ring-white/10 group-hover:block group-focus-within:block">
                        <span className="text-green-400">
                          {entry.correctPredictions}
                        </span>
                        <span className="mx-1 text-white/30">/</span>
                        <span className="text-red-400">
                          {entry.incorrectPredictions}
                        </span>
                        <span className="mx-1 text-white/30">/</span>
                        <span className="text-white/40">
                          {entry.missedPredictions}
                        </span>
                        <span className="ml-2 text-amber-400">
                          (
                          {formatAccuracy(
                            entry.correctPredictions,
                            entry.incorrectPredictions,
                          )}
                          %)
                        </span>
                      </span>
                    </span>
                  </div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-foreground/60 sm:table-cell">
                  {formatJoiningDate(entry.joiningDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
