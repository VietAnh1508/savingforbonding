"use client";

import { useMemo, useState } from "react";

import { UserAvatar } from "~/app/_components/user-avatar";
import {
  formatPct,
  formatSigned,
} from "~/app/insight/_components/star-efficiency-format";
import { type RouterOutputs } from "~/trpc/react";

type Entry = RouterOutputs["leaderboard"]["starEfficiency"][number];

type SortKey =
  | "beersSavedPerStarredVote"
  | "totalBeersSaved"
  | "starredAccuracy"
  | "plainAccuracy"
  | "starredVotes"
  | "avgTierChosen";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "beersSavedPerStarredVote", label: "Beers saved / star" },
  { key: "totalBeersSaved", label: "Total saved" },
  { key: "starredAccuracy", label: "Starred acc." },
  { key: "plainAccuracy", label: "Plain acc." },
  { key: "starredVotes", label: "Stars used" },
  { key: "avgTierChosen", label: "Avg tier *" },
];

const LOW_SAMPLE_THRESHOLD = 8;

export function StarEfficiencyTable({
  entries,
  currentUserId,
}: {
  entries: Entry[];
  currentUserId?: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("beersSavedPerStarredVote");

  const sorted = useMemo(() => {
    const withStars = entries.filter((e) => e.starredVotes > 0);
    const withoutStars = entries.filter((e) => e.starredVotes === 0);

    withStars.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return bv - av;
    });

    // Zero-star users have no efficiency signal — pin them below the ranked
    // rows instead of interleaving with sorted (but undefined) values.
    return [...withStars, ...withoutStars];
  }, [entries, sortKey]);

  return (
    <div className="mt-6">
      <div className="overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-sm text-foreground/60">
              <th className="px-1 py-3 text-center font-medium sm:px-2">
                Rank
              </th>
              <th className="px-1 py-3 font-medium sm:px-2">Player</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="w-px whitespace-nowrap px-4 py-3 text-right font-medium"
                >
                  <button
                    type="button"
                    onClick={() => setSortKey(col.key)}
                    className={`transition ${
                      sortKey === col.key
                        ? "text-foreground"
                        : "hover:text-foreground"
                    }`}
                  >
                    {col.label}
                    {sortKey === col.key ? " ▾" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, index) => {
              const isCurrentUser = entry.id === currentUserId;
              const hasStars = entry.starredVotes > 0;
              const lowSample =
                hasStars && entry.starredVotes < LOW_SAMPLE_THRESHOLD;

              return (
                <tr
                  key={entry.id}
                  className={`border-b border-foreground/5 transition ${
                    isCurrentUser
                      ? "border-l-2 border-l-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15"
                      : "hover:bg-foreground/5"
                  } ${!hasStars ? "opacity-60" : ""}`}
                >
                  <td className="px-1 py-3 text-center sm:px-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold text-foreground/60">
                      {hasStars ? index + 1 : "—"}
                    </span>
                  </td>
                  <td className="px-1 py-3 sm:px-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={entry.name}
                        image={entry.image}
                        size={32}
                        fallbackClassName="bg-emerald-500/20 text-sm"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {entry.name ?? "Anonymous"}
                        </span>
                        {lowSample && (
                          <span className="w-fit text-xs text-foreground/40">
                            low sample ({entry.starredVotes} starred)
                          </span>
                        )}
                        {!hasStars && (
                          <span className="w-fit text-xs text-foreground/40">
                            no stars used
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                    {entry.beersSavedPerStarredVote !== null
                      ? formatSigned(entry.beersSavedPerStarredVote, 1)
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {entry.totalBeersSaved !== null
                      ? formatSigned(entry.totalBeersSaved)
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatPct(entry.starredAccuracy)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatPct(entry.plainAccuracy)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {entry.starredVotes}/{entry.starsAllocated}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {entry.avgTierChosen !== null
                      ? `×${entry.avgTierChosen.toFixed(1)}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-foreground/40">
        &quot;Beers saved&quot; compares each starred vote&apos;s actual beer
        outcome against what a plain (unstarred) vote on the same pick would
        have cost — positive means starring paid off.
      </p>
      <p className="mt-1 text-xs text-foreground/40">
        * Avg tier is low-signal right now: almost every star cast so far is
        the minimum tier (×2), which is also the maximum allowed in Round of
        32/16/Quarter-final. Real tier choice only opens up from the
        Semi-final onward.
      </p>
    </div>
  );
}
