import Image from "next/image";

import { type RouterOutputs } from "~/trpc/react";

type Entry =
  | RouterOutputs["leaderboard"]["global"][number]
  | RouterOutputs["leaderboard"]["weekly"][number];

export function LeaderboardTable({
  entries,
  pointsLabel = "Points",
}: {
  entries: Entry[];
  pointsLabel?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
        No rankings yet. Be the first to make a correct prediction!
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
            <th className="px-4 py-3 text-right font-medium">{pointsLabel}</th>
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
              <td className="px-4 py-3 text-right font-bold text-emerald-400">
                {entry.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
