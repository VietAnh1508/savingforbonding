"use client";

import { UserAvatar } from "~/app/_components/user-avatar";
import { type RouterOutputs } from "~/trpc/react";

import {
  formatAccuracy,
  RANK_BADGE_CLASSES,
} from "~/lib/leaderboard-constants";

type Entry = RouterOutputs["leaderboard"]["global"]["entries"][number];

const RANK_TITLES: Record<number, string> = {
  1: "The Oracle",
  2: "Sharp Eye",
  3: "Good Read",
};

const MIN_PARTICIPATION_RATE = 0.4;

function getParticipationRate(entry: Entry) {
  const total =
    entry.correctPredictions +
    entry.incorrectPredictions +
    entry.missedPredictions;
  if (total === 0) return 0;
  return (entry.correctPredictions + entry.incorrectPredictions) / total;
}

function computeAccuracyRankedEntries(entries: Entry[]) {
  const sorted = [...entries].sort((a, b) => {
    if (b.correctPredictions !== a.correctPredictions)
      return b.correctPredictions - a.correctPredictions;
    return b.accuracy - a.accuracy;
  });

  const ranked: Array<Entry & { accuracyRank: number }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]!;
    const prev = ranked[i - 1];
    let accuracyRank: number;
    if (!prev) {
      accuracyRank = 1;
    } else if (
      prev.correctPredictions === entry.correctPredictions &&
      prev.accuracy === entry.accuracy
    ) {
      accuracyRank = prev.accuracyRank;
    } else {
      accuracyRank = prev.accuracyRank + 1;
    }
    ranked.push({ ...entry, accuracyRank });
  }
  return ranked;
}

function renderAccuracyRow(
  entry: Entry & { accuracyRank: number },
  isCurrentUser: boolean,
) {
  const title = RANK_TITLES[entry.accuracyRank] ?? null;
  const isDimmed = getParticipationRate(entry) <= MIN_PARTICIPATION_RATE;

  return (
    <tr
      key={entry.id}
      className={`border-b border-foreground/5 transition ${
        isCurrentUser
          ? "border-l-2 border-l-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15"
          : "hover:bg-foreground/5"
      } ${isDimmed ? "opacity-50" : ""}`}
    >
      <td className="px-1 py-3 sm:px-2">
        <div className="flex justify-center">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold text-foreground/60">
            {entry.accuracyRank}
          </span>
        </div>
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
            <span className="font-medium">{entry.name ?? "Anonymous"}</span>
            {title && (
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${RANK_BADGE_CLASSES[entry.accuracyRank] ?? ""}`}
              >
                {title}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
        {formatAccuracy(entry.correctPredictions, entry.incorrectPredictions)}
        %
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-sm sm:table-cell">
        <span className="text-green-500">{entry.correctPredictions}</span>
        <span className="mx-1 text-foreground/30">/</span>
        <span className="text-red-500">{entry.incorrectPredictions}</span>
        <span className="mx-1 text-foreground/30">/</span>
        <span className="text-foreground/40">{entry.missedPredictions}</span>
      </td>
    </tr>
  );
}

export function AccuracyTable({
  entries,
  currentUserId,
}: {
  entries: Entry[];
  currentUserId?: string;
}) {
  const rankedEntries = computeAccuracyRankedEntries(entries);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-8 text-center text-foreground/50">
        No registered users yet.
      </div>
    );
  }

  const upperTierEntries: typeof rankedEntries = [];
  const lowerTierEntries: typeof rankedEntries = [];
  for (const entry of rankedEntries) {
    const tier =
      getParticipationRate(entry) > MIN_PARTICIPATION_RATE
        ? upperTierEntries
        : lowerTierEntries;
    tier.push(entry);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10">
      <table className="w-full">
        <thead>
          <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-sm text-foreground/60">
            <th className="px-1 py-3 text-center font-medium sm:px-2">
              Rank
            </th>
            <th className="px-1 py-3 font-medium sm:px-2">Player</th>
            <th className="w-px whitespace-nowrap px-4 py-3 text-right font-medium">
              Accuracy
            </th>
            <th className="hidden w-px whitespace-nowrap px-4 py-3 font-medium sm:table-cell">
              W / L / M
            </th>
          </tr>
        </thead>
        <tbody>
          {upperTierEntries.map((entry) =>
            renderAccuracyRow(entry, entry.id === currentUserId),
          )}
          {lowerTierEntries.length > 0 && (
            <tr>
              <td
                colSpan={4}
                className="border-b border-foreground/5 bg-foreground/5 px-4 py-2 text-xs text-foreground/40"
              >
                Below {Math.round(MIN_PARTICIPATION_RATE * 100)}% participation
              </td>
            </tr>
          )}
          {lowerTierEntries.map((entry) =>
            renderAccuracyRow(entry, entry.id === currentUserId),
          )}
        </tbody>
      </table>
    </div>
  );
}
