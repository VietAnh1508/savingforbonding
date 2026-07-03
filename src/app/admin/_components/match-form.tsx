"use client";

import { useState } from "react";

import {
  fromVietnamDatetimeLocal,
  toVNDate,
  validateVotingRatios,
} from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Match = RouterOutputs["admin"]["listAll"][number];
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

type Props = {
  editingMatch: Match | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function MatchForm({ editingMatch, onSuccess, onCancel }: Props) {
  const utils = api.useUtils();

  const initialValues = editingMatch
    ? {
        homeCountry: editingMatch.homeCountry,
        awayCountry: editingMatch.awayCountry,
        kickoffAt: toVNDate(new Date(editingMatch.kickoffAt), 16),
        tournament: editingMatch.tournament,
        homeRatio: String(editingMatch.homeRatio),
        awayRatio: String(editingMatch.awayRatio),
        status: editingMatch.status as EditableStatus,
      }
    : emptyForm;

  const [form, setForm] = useState(initialValues);
  const [formError, setFormError] = useState<string | null>(null);

  const createMatch = api.admin.create.useMutation({
    onSuccess: () => {
      void utils.admin.listAll.invalidate();
      setForm(emptyForm);
      setFormError(null);
      onSuccess();
    },
  });

  const updateMatch = api.admin.update.useMutation({
    onSuccess: () => {
      void utils.admin.listAll.invalidate();
      setFormError(null);
      onSuccess();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const homeRatio = parseFloat(form.homeRatio);
    const awayRatio = parseFloat(form.awayRatio);

    if (Number.isNaN(homeRatio) || Number.isNaN(awayRatio)) {
      setFormError("Ratios must be valid numbers");
      return;
    }

    const ratioError = validateVotingRatios(homeRatio, awayRatio);
    if (ratioError) {
      setFormError(ratioError);
      return;
    }

    const data = {
      homeCountry: form.homeCountry,
      awayCountry: form.awayCountry,
      kickoffAt: fromVietnamDatetimeLocal(form.kickoffAt),
      tournament: form.tournament,
      homeRatio,
      awayRatio,
      status: form.status,
    };

    if (editingMatch) {
      updateMatch.mutate({ id: editingMatch.id, ...data });
    } else {
      createMatch.mutate(data);
    }
  }

  const inputClass = "w-full rounded-lg border border-foreground/10 bg-foreground/10 px-3 py-2";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <p className="text-sm text-foreground/50">
        Set home and away ratios freely. Use 0 for no handicap on that side.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm text-foreground/60">Home Country</span>
          <input
            required
            value={form.homeCountry}
            onChange={(e) => setForm({ ...form, homeCountry: e.target.value })}
            className={inputClass}
            placeholder="Brazil"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-foreground/60">Away Country</span>
          <input
            required
            value={form.awayCountry}
            onChange={(e) => setForm({ ...form, awayCountry: e.target.value })}
            className={inputClass}
            placeholder="Argentina"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-foreground/60">Kickoff</span>
          <input
            required
            type="datetime-local"
            value={form.kickoffAt}
            onChange={(e) => setForm({ ...form, kickoffAt: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-foreground/60">Tournament</span>
          <input
            required
            value={form.tournament}
            onChange={(e) => setForm({ ...form, tournament: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-foreground/60">Home Ratio (1)</span>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.homeRatio}
            onChange={(e) => setForm({ ...form, homeRatio: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-foreground/60">Away Ratio (2)</span>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.awayRatio}
            onChange={(e) => setForm({ ...form, awayRatio: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-foreground/60">Status</span>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as EditableStatus })
            }
            className={inputClass}
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
          {editingMatch ? "Save Changes" : "Add Match"}
        </button>
        {editingMatch && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-foreground/10 px-4 py-2 transition hover:bg-foreground/10"
          >
            Cancel
          </button>
        )}
      </div>

      {(formError ?? createMatch.error ?? updateMatch.error) && (
        <p className="text-sm text-red-400">
          {formError ??
            createMatch.error?.message ??
            updateMatch.error?.message}
        </p>
      )}
    </form>
  );
}
