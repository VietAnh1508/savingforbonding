"use client";

import { StarEfficiencyChart } from "~/app/insight/_components/star-efficiency-chart";
import { StarEfficiencyTable } from "~/app/insight/_components/star-efficiency-table";
import { api } from "~/trpc/react";

export function StarEfficiencyPanel({
  currentUserId,
}: {
  currentUserId?: string;
}) {
  const { data, isLoading } = api.leaderboard.starEfficiency.useQuery();

  if (isLoading) {
    return (
      <div className="h-[480px] animate-pulse rounded-xl bg-foreground/5" />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6 text-center text-sm text-foreground/40">
        No registered users yet.
      </div>
    );
  }

  return (
    <div>
      <StarEfficiencyChart entries={data} currentUserId={currentUserId} />
      <StarEfficiencyTable entries={data} currentUserId={currentUserId} />
    </div>
  );
}
