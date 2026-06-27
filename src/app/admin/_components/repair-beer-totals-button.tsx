"use client";

import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { api } from "~/trpc/react";

export function RepairBeerTotalsButton() {
  const repair = api.admin.repairBeerTotals.useMutation();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div>
          <h2 className="font-semibold text-amber-700 dark:text-amber-300">
            Repair Beer Totals
          </h2>
          <p className="text-sm text-foreground/60">
            Recalculates every user&apos;s total and weekly beer count from their
            resolved vote records. Use after correcting match results or vote
            data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => repair.mutate()}
          disabled={repair.isPending}
          className="cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            {repair.isPending && <SpinnerIcon />}
            Repair totals
          </span>
        </button>
      </div>

      {repair.isSuccess && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Recalculated from {repair.data.completedMatchCount} completed matches
          — {repair.data.usersUpdated} user
          {repair.data.usersUpdated === 1 ? "" : "s"} updated.
        </p>
      )}

      {repair.isError && (
        <p className="text-sm text-red-600 dark:text-red-300">
          {repair.error.message}
        </p>
      )}
    </div>
  );
}
