"use client";

import { useState } from "react";

import { MatchStatusBadge } from "~/app/_components/match-status-badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { formatDateTime } from "~/lib/datetime";
import { isMatchEditable } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Match = RouterOutputs["admin"]["listAll"][number];

type Props = {
  match: Match;
  onEdit: (match: Match) => void;
};

export function MatchCard({ match, onEdit }: Props) {
  const utils = api.useUtils();
  const [scores, setScores] = useState({ home: "", away: "" });

  const completeMatch = api.admin.complete.useMutation({
    onSuccess: () => void utils.admin.listAll.invalidate(),
  });

  const deleteMatch = api.admin.delete.useMutation({
    onSuccess: () => void utils.admin.listAll.invalidate(),
  });
  const editable = isMatchEditable(match.status);

  return (
    <Card className="block rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-4 ring-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-semibold">
            {match.homeCountry} vs {match.awayCountry}
          </div>
          <div className="mt-1 text-sm text-foreground/50">
            {formatDateTime(match.kickoffAt)}
          </div>
          <div className="mt-1 font-mono text-sm text-emerald-600 dark:text-emerald-400">
            1: {match.homeRatio.toFixed(2)} · 2: {match.awayRatio.toFixed(2)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <MatchStatusBadge status={match.status} />
            {match.homeScore !== null && match.awayScore !== null && (
              <span className="text-xs text-foreground/50">
                {match.homeScore}:{match.awayScore}
              </span>
            )}
          </div>
        </div>

        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onEdit(match)}
              className="h-auto rounded-lg px-3 py-1 text-sm"
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (confirm("Delete this match?")) {
                  deleteMatch.mutate({ id: match.id });
                }
              }}
              className="h-auto rounded-lg px-3 py-1 text-sm"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {editable && match.status !== "CANCELLED" && (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-foreground/10 pt-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-foreground/50">Home score</span>
            <input
              type="number"
              min="0"
              value={scores.home}
              onChange={(e) => setScores({ ...scores, home: e.target.value })}
              className="w-20 rounded-lg border border-foreground/10 bg-foreground/10 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-foreground/50">Away score</span>
            <input
              type="number"
              min="0"
              value={scores.away}
              onChange={(e) => setScores({ ...scores, away: e.target.value })}
              className="w-20 rounded-lg border border-foreground/10 bg-foreground/10 px-2 py-1"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
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
              completeMatch.mutate({ id: match.id, homeScore: home, awayScore: away });
            }}
            className="h-auto rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-500/30 dark:text-amber-300"
          >
            Complete Match
          </Button>
        </div>
      )}

      {!editable && (
        <p className="mt-3 text-xs text-foreground/40">
          Completed — locked, cannot be modified
        </p>
      )}
    </Card>
  );
}
