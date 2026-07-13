"use client";

import { useState } from "react";

import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { api } from "~/trpc/react";

type FifaSyncResult = {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  teamsUpdated: number;
  resolved: number;
  championVotesResolved: number;
};

export function FifaSyncBanner() {
  const utils = api.useUtils();
  const [syncPending, setSyncPending] = useState(false);
  const [syncResult, setSyncResult] = useState<FifaSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function syncFromFifa() {
    setSyncPending(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const response = await fetch("/api/admin/sync-fifa", { method: "POST" });
      const data = (await response.json()) as FifaSyncResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Sync failed");
      }

      setSyncResult(data);
      void utils.admin.listAll.invalidate();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div>
          <h2 className="font-semibold text-emerald-700 dark:text-emerald-300">
            FIFA World Cup 2026
          </h2>
          <p className="text-sm text-foreground/60">
            Runs automatically every day at 12:00 ICT. Safe to trigger manually
            anytime — preserves beer ratios and votes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncFromFifa()}
          disabled={syncPending}
          className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          <span className="flex items-center gap-2">
            {syncPending && <SpinnerIcon />}
            Sync from FIFA
          </span>
        </button>
      </div>

      {syncPending && (
        <p className="text-sm text-foreground/60">
          Syncing in progress — you can navigate away, the sync will complete in
          the background.
        </p>
      )}

      {syncResult && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Synced {syncResult.fetched} matches ({syncResult.created} created,{" "}
          {syncResult.updated} updated, {syncResult.unchanged} unchanged
          {syncResult.teamsUpdated > 0
            ? `, ${syncResult.teamsUpdated} teams updated`
            : ""}
          {syncResult.resolved > 0
            ? `, ${syncResult.resolved} results resolved`
            : ""}
          {syncResult.championVotesResolved > 0
            ? ", champion votes settled"
            : ""}
          ).
        </p>
      )}

      {syncError && (
        <p className="text-sm text-red-600 dark:text-red-300">{syncError}</p>
      )}
    </div>
  );
}

