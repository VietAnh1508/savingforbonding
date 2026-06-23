import Image from "next/image";

import { formatJoiningDate } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type Entry = RouterOutputs["leaderboard"]["global"]["entries"][number];

const RANK_BADGE_CLASSES: Record<number, string> = {
  1: "bg-yellow-400/20 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300",
  2: "bg-slate-400/20 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
  3: "bg-amber-600/20 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

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
}: {
  entries: Entry[];
  beersLabel?: string;
  currentUserId?: string;
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
            <th className="px-2 py-3 text-center font-medium sm:px-4">Rank</th>
            <th className="px-2 py-3 font-medium sm:px-4">Player</th>
            <th className="px-4 py-3 text-right font-medium">{beersLabel}</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Joining Date</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isCurrentUser = !!currentUserId && entry.id === currentUserId;
            return (
            <tr
              key={entry.id}
              className={`border-b border-foreground/5 transition ${
                isCurrentUser
                  ? "border-l-2 border-l-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15"
                  : "hover:bg-foreground/5"
              }`}
            >
              <td className="px-2 py-3 sm:px-4">
                <div className="flex justify-center">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold text-foreground/60">
                    {entry.rank}
                  </span>
                </div>
              </td>
              <td className="px-2 py-3 sm:px-4">
                <div className="flex items-center gap-3">
                  {entry.image ? (
                    <Image
                      src={entry.image}
                      alt={entry.name ?? "User"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm">
                      {(entry.name ?? "?")[0]}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {entry.name ?? "Anonymous"}
                    </span>
                    {isCurrentUser && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        You
                      </span>
                    )}
                    {titleForRank(rankOrder[entry.rank] ?? 0) && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RANK_BADGE_CLASSES[rankOrder[entry.rank] ?? 0]}`}>
                        {titleForRank(rankOrder[entry.rank] ?? 0)}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                <span className="group relative inline-block cursor-help outline-none" tabIndex={0}>
                  🍺 {entry.beers}
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
                  </span>
                </span>
              </td>
              <td className="hidden px-4 py-3 text-sm text-foreground/60 sm:table-cell">
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
