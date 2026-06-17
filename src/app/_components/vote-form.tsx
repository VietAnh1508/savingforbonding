"use client";

import { BEER_NO_BET, formatBeers, outcomeShort } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";
import { type VoteOutcome } from "../../../generated/prisma";
import { useToast } from "./toast";

const OUTCOMES: VoteOutcome[] = ["HOME_WIN", "DRAW", "AWAY_WIN"];

type MatchDetail = NonNullable<RouterOutputs["match"]["getById"]>;

export function VoteForm({
  matchId,
  homeCountry,
  awayCountry,
  initialMatch,
}: {
  matchId: string;
  homeCountry: string;
  awayCountry: string;
  initialMatch: MatchDetail;
}) {
  const utils = api.useUtils();
  const toast = useToast();

  const { data: match } = api.match.getById.useQuery(
    { id: matchId },
    { initialData: initialMatch },
  );

  const currentVote = match?.userVote?.outcome;
  const votingOpen = match?.votingOpen ?? false;

  const castVote = api.vote.cast.useMutation({
    onMutate: async ({ outcome }) => {
      await utils.match.getById.cancel({ id: matchId });

      const previous = utils.match.getById.getData({ id: matchId });

      utils.match.getById.setData({ id: matchId }, (old) => {
        if (!old) return old;

        const existingVote = old.userVote;

        return {
          ...old,
          userVote: existingVote
            ? { ...existingVote, outcome }
            : {
                id: "optimistic",
                userId: "",
                matchId,
                outcome,
                isCorrect: null,
                points: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
        };
      });

      return { previous };
    },
    onSuccess: () => {
      toast.success("Prediction saved!");
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        utils.match.getById.setData({ id: matchId }, context.previous);
      }
    },
    onSettled: () => {
      void utils.match.getById.invalidate({ id: matchId });
      void utils.match.listUpcoming.invalidate();
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
      <h3 className="text-lg font-semibold">Place your vote</h3>
      <p className="text-sm text-white/50">
        Required for every match — skip it and you owe{" "}
        {formatBeers(BEER_NO_BET)} anyway.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {OUTCOMES.map((outcome) => (
          <button
            key={outcome}
            type="button"
            disabled={castVote.isPending}
            onClick={() => castVote.mutate({ matchId, outcome })}
            className={`cursor-pointer rounded-xl border p-4 text-center transition ${
              currentVote === outcome
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-white/10"
            }`}
          >
            {outcome === "DRAW" ? (
              <>
                <div className="text-2xl font-bold">
                  {outcomeShort(outcome)}
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {label(outcome)}
                </div>
              </>
            ) : (
              <div className="font-semibold">{label(outcome)}</div>
            )}
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

