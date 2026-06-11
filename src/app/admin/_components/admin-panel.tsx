"use client";

import { useState } from "react";

import {
  formatMatchDateTime,
  isMatchEditable,
  validateBettingRatios,
} from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

type Match = RouterOutputs["admin"]["listAll"][number];
type FifaSyncResult = {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  teamsUpdated: number;
  resolved: number;
};
type EditableStatus = "SCHEDULED" | "LIVE" | "POSTPONED" | "CANCELLED";

const emptyForm = {
  homeCountry: "",
  awayCountry: "",
  kickoffAt: "",
  tournament: "FIFA World Cup",
  homeRatio: "2.0",
  awayRatio: "0",
  status: "SCHEDULED" as EditableStatus,
};

export function AdminPanel() {
  const { data: matches = [], isLoading } = api.admin.listAll.useQuery();
  const utils = api.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [completeScores, setCompleteScores] = useState<
    Record<string, { home: string; away: string }>
  >({});
  const [syncPending, setSyncPending] = useState(false);
  const [syncResult, setSyncResult] = useState<FifaSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const createMatch = api.admin.create.useMutation({
    onSuccess: () => {
      void utils.admin.listAll.invalidate();
      setForm(emptyForm);
      setFormError(null);
    },
  });

  const updateMatch = api.admin.update.useMutation({
    onSuccess: () => {
      void utils.admin.listAll.invalidate();
      setEditingId(null);
      setForm(emptyForm);
      setFormError(null);
    },
  });

  const completeMatch = api.admin.complete.useMutation({
    onSuccess: () => void utils.admin.listAll.invalidate(),
  });

  const deleteMatch = api.admin.delete.useMutation({
    onSuccess: () => void utils.admin.listAll.invalidate(),
  });

  async function syncFromFifa() {
    setSyncPending(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const response = await fetch("/api/admin/sync-fifa", { method: "POST" });
      const data = (await response.json()) as FifaSyncResult & { error?: string };

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

  function startEdit(match: Match) {
    setEditingId(match.id);
    setFormError(null);
    setForm({
      homeCountry: match.homeCountry,
      awayCountry: match.awayCountry,
      kickoffAt: new Date(match.kickoffAt).toISOString().slice(0, 16),
      tournament: match.tournament,
      homeRatio: String(match.homeRatio),
      awayRatio: String(match.awayRatio),
      status: match.status as EditableStatus,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const homeRatio = parseFloat(form.homeRatio);
    const awayRatio = parseFloat(form.awayRatio);

    if (Number.isNaN(homeRatio) || Number.isNaN(awayRatio)) {
      setFormError("Ratios must be valid numbers");
      return;
    }

    const ratioError = validateBettingRatios(homeRatio, awayRatio);
    if (ratioError) {
      setFormError(ratioError);
      return;
    }

    const data = {
      homeCountry: form.homeCountry,
      awayCountry: form.awayCountry,
      kickoffAt: new Date(form.kickoffAt),
      tournament: form.tournament,
      homeRatio,
      awayRatio,
      status: form.status,
    };

    if (editingId) {
      updateMatch.mutate({ id: editingId, ...data });
    } else {
      createMatch.mutate(data);
    }
  }

  if (isLoading) {
    return <p className="text-white/50">Loading matches...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div>
          <h2 className="font-semibold text-emerald-300">FIFA World Cup 2026</h2>
          <p className="text-sm text-white/60">
            Safe to run anytime. Preserves beer ratios and votes; only updates
            schedule, teams, scores, and results from FIFA.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncFromFifa()}
          disabled={syncPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {syncPending ? "Syncing..." : "Sync from FIFA"}
        </button>
      </div>

      {syncResult && (
        <p className="text-sm text-emerald-300">
          Synced {syncResult.fetched} matches ({syncResult.created} created,{" "}
          {syncResult.updated} updated, {syncResult.unchanged} unchanged
          {syncResult.teamsUpdated > 0
            ? `, ${syncResult.teamsUpdated} teams updated`
            : ""}
          {syncResult.resolved > 0
            ? `, ${syncResult.resolved} results resolved`
            : ""}
          ).
        </p>
      )}

      {syncError && <p className="text-sm text-red-300">{syncError}</p>}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <h2 className="text-lg font-semibold">
          {editingId ? "Edit Match" : "Add New Match"}
        </h2>

        <p className="text-sm text-white/50">
          Set a ratio on one side only — the other must be 0.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm text-white/60">Home Country</span>
            <input
              required
              value={form.homeCountry}
              onChange={(e) => setForm({ ...form, homeCountry: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              placeholder="Brazil"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-white/60">Away Country</span>
            <input
              required
              value={form.awayCountry}
              onChange={(e) => setForm({ ...form, awayCountry: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              placeholder="Argentina"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-white/60">Kickoff</span>
            <input
              required
              type="datetime-local"
              value={form.kickoffAt}
              onChange={(e) => setForm({ ...form, kickoffAt: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-white/60">Tournament</span>
            <input
              required
              value={form.tournament}
              onChange={(e) => setForm({ ...form, tournament: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-white/60">Home Ratio (1)</span>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.homeRatio}
              onChange={(e) => setForm({ ...form, homeRatio: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-white/60">Away Ratio (2)</span>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.awayRatio}
              onChange={(e) => setForm({ ...form, awayRatio: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-white/60">Status</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as EditableStatus })
              }
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="LIVE">Live</option>
              <option value="POSTPONED">Postponed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMatch.isPending || updateMatch.isPending}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {editingId ? "Save Changes" : "Add Match"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setFormError(null);
              }}
              className="rounded-lg border border-white/10 px-4 py-2 transition hover:bg-white/10"
            >
              Cancel
            </button>
          )}
        </div>

        {(formError || createMatch.error || updateMatch.error) && (
          <p className="text-sm text-red-400">
            {formError ??
              createMatch.error?.message ??
              updateMatch.error?.message}
          </p>
        )}
      </form>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Matches</h2>
        {matches.length === 0 ? (
          <p className="text-white/50">No matches yet.</p>
        ) : (
          matches.map((match) => {
            const editable = isMatchEditable(match.status);
            const scores = completeScores[match.id] ?? { home: "", away: "" };

            return (
              <div
                key={match.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {match.homeCountry} vs {match.awayCountry}
                    </div>
                    <div className="mt-1 text-sm text-white/50">
                      {formatMatchDateTime(match.kickoffAt)}
                    </div>
                    <div className="mt-1 font-mono text-sm text-emerald-400">
                      1: {match.homeRatio.toFixed(2)} · 2:{" "}
                      {match.awayRatio.toFixed(2)}
                    </div>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                        match.status === "COMPLETED"
                          ? "bg-gray-500/20 text-gray-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {match.status}
                      {match.homeScore !== null &&
                        match.awayScore !== null &&
                        ` — ${match.homeScore}:${match.awayScore}`}
                    </span>
                  </div>

                  {editable && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(match)}
                        className="rounded-lg border border-white/10 px-3 py-1 text-sm hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Delete this match?")) {
                            deleteMatch.mutate({ id: match.id });
                          }
                        }}
                        className="rounded-lg border border-red-500/30 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {editable && match.status !== "CANCELLED" && (
                  <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/10 pt-4">
                    <label className="space-y-1">
                      <span className="text-xs text-white/50">Home score</span>
                      <input
                        type="number"
                        min="0"
                        value={scores.home}
                        onChange={(e) =>
                          setCompleteScores({
                            ...completeScores,
                            [match.id]: { ...scores, home: e.target.value },
                          })
                        }
                        className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-white/50">Away score</span>
                      <input
                        type="number"
                        min="0"
                        value={scores.away}
                        onChange={(e) =>
                          setCompleteScores({
                            ...completeScores,
                            [match.id]: { ...scores, away: e.target.value },
                          })
                        }
                        className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={completeMatch.isPending}
                      onClick={() => {
                        const home = parseInt(scores.home, 10);
                        const away = parseInt(scores.away, 10);
                        if (Number.isNaN(home) || Number.isNaN(away)) return;
                        if (
                          !confirm(
                            "Mark match as completed? Users can no longer vote or edit.",
                          )
                        )
                          return;
                        completeMatch.mutate({
                          id: match.id,
                          homeScore: home,
                          awayScore: away,
                        });
                      }}
                      className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/30"
                    >
                      Complete Match
                    </button>
                  </div>
                )}

                {!editable && (
                  <p className="mt-3 text-xs text-white/40">
                    Completed — locked, cannot be modified
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
