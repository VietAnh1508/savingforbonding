import Image from "next/image";

import { formatJoiningDate } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type Entry = RouterOutputs["leaderboard"]["global"][number];

function titleForRank(rank: number): string | null {
  switch (rank) {
    case 1:
      return "The Hand of God";
    case 2:
      return "National Prider";
    case 3:
      return "Doctor of Prediction";
    default:
      return null;
  }
}

export function LeaderboardTable({
  entries,
  beersLabel = "Beers",
}: {
  entries: Entry[];
  beersLabel?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
        No registered users yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-sm text-white/60">
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Player</th>
            <th className="px-4 py-3 font-medium">Joining Date</th>
            <th className="px-4 py-3 text-right font-medium">{beersLabel}</th>
            <th className="px-4 py-3 font-medium">Title</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-white/5 transition hover:bg-white/5"
            >
              <td className="px-4 py-3">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    entry.rank === 1
                      ? "bg-yellow-500/20 text-yellow-300"
                      : entry.rank === 2
                        ? "bg-gray-400/20 text-gray-300"
                        : entry.rank === 3
                          ? "bg-amber-700/20 text-amber-400"
                          : "bg-white/5 text-white/60"
                  }`}
                >
                  {entry.rank}
                </span>
              </td>
              <td className="px-4 py-3">
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
                  <span className="font-medium">
                    {entry.name ?? "Anonymous"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-white/60">
                {formatJoiningDate(entry.joiningDate)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-amber-400">
                <span className="group relative inline-block cursor-help">
                  🍺 {entry.beers}
                  <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-normal shadow-lg ring-1 ring-white/10 group-hover:block">
                    <span className="text-green-400">{entry.correctPredictions}</span>
                    <span className="mx-1 text-white/30">/</span>
                    <span className="text-red-400">{entry.incorrectPredictions}</span>
                    <span className="mx-1 text-white/30">/</span>
                    <span className="text-white/40">{entry.missedPredictions}</span>
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-emerald-300">
                {titleForRank(entry.rank) ?? (
                  <span className="text-white/30">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
