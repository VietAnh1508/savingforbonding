"use client";

import { type VoteOutcome } from "../../../generated/prisma";
import { outcomeShort } from "~/lib/match";
import { api } from "~/trpc/react";

const OUTCOMES: VoteOutcome[] = ["HOME_WIN", "DRAW", "AWAY_WIN"];

export function VoteForm({
  matchId,
  homeCountry,
  awayCountry,
  currentVote,
  votingOpen,
}: {
  matchId: string;
  homeCountry: string;
  awayCountry: string;
  currentVote?: VoteOutcome | null;
  votingOpen: boolean;
}) {
  const utils = api.useUtils();

  const castVote = api.vote.cast.useMutation({
    onSuccess: () => {
      void utils.match.getById.invalidate({ id: matchId });
    },
  });

  function label(outcome: VoteOutcome) {
    switch (outcome) {
      case "HOME_WIN":
        return homeCountry;
      case "DRAW":
        return "Draw";
      case "AWAY_WIN":
        return awayCountry;
    }
  }

  if (!votingOpen) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300">
        Voting is locked for this match
        {currentVote && (
          <p className="mt-2 text-sm">
            Your prediction: <strong>{outcomeShort(currentVote)}</strong>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cast your prediction</h3>
      <div className="grid grid-cols-3 gap-3">
        {OUTCOMES.map((outcome) => (
          <button
            key={outcome}
            type="button"
            disabled={castVote.isPending}
            onClick={() => castVote.mutate({ matchId, outcome })}
            className={`rounded-xl border p-4 text-center transition ${
              currentVote === outcome
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-white/10"
            }`}
          >
            <div className="text-2xl font-bold">{outcomeShort(outcome)}</div>
            <div className="mt-1 text-xs text-white/60">{label(outcome)}</div>
          </button>
        ))}
      </div>
      {castVote.error && (
        <p className="text-sm text-red-400">{castVote.error.message}</p>
      )}
      {currentVote && (
        <p className="text-center text-sm text-white/50">
          You can change your vote until 5 minutes before kickoff
        </p>
      )}
    </div>
  );
}
