"use client";

import { type ReactNode } from "react";

import { TrendIcon } from "~/app/_components/icons/trend-icon";
import { formatAxisDate } from "~/app/insight/_components/format-axis-date";
import { findBiggestSingleDayMoves, type RankMove } from "~/lib/rank-history";
import { api } from "~/trpc/react";

function MoveStat({
  label,
  icon,
  move,
  name,
  accentClass,
}: {
  label: string;
  icon: ReactNode;
  move: RankMove;
  name: string;
  accentClass: string;
}) {
  return (
    <div className="flex-1 rounded-lg border border-foreground/10 bg-card p-4">
      <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
        <span className={accentClass}>{icon}</span> {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${accentClass}`}>{name}</p>
      <p className="mt-0.5 text-xs text-foreground/50">
        <span className="font-bold">
          #{move.fromRank} → #{move.toRank}
        </span>{" "}
        ({formatAxisDate(move.fromDate)} → {formatAxisDate(move.toDate)})
      </p>
    </div>
  );
}

export function BiggestMoverCard() {
  const { data, isLoading } = api.leaderboard.rankByDay.useQuery();

  if (isLoading) {
    return (
      <div className="mb-4 h-24 animate-pulse rounded-xl bg-foreground/5" />
    );
  }

  if (!data) return null;

  const { biggestClimb, biggestDrop } = findBiggestSingleDayMoves(data.days);
  if (!biggestClimb && !biggestDrop) return null;

  const nameFor = (userId: string) =>
    data.series.find((s) => s.userId === userId)?.name ?? "Anonymous";

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      {biggestClimb && (
        <MoveStat
          label="Biggest Climb"
          icon={<TrendIcon direction="up" />}
          move={biggestClimb}
          name={nameFor(biggestClimb.userId)}
          accentClass="text-rose-600 dark:text-rose-400"
        />
      )}
      {biggestDrop && (
        <MoveStat
          label="Biggest Drop"
          icon={<TrendIcon direction="down" />}
          move={biggestDrop}
          name={nameFor(biggestDrop.userId)}
          accentClass="text-emerald-600 dark:text-emerald-400"
        />
      )}
    </div>
  );
}
