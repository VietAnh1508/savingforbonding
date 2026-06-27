"use client";

import { BEER_NO_BET, formatBeers, outcomeLabel } from "~/lib/match";
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
      void utils.match.listMatches.invalidate();
    },
  });

  if (!votingOpen) {
    const userVote = match?.userVote;
    const isCorrect = userVote?.isCorrect;
    const points = userVote?.points ?? 0;

    if (!currentVote) {
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-amber-700 dark:text-amber-300">
          <p className="font-medium">Voting is locked</p>
          <p className="mt-1 text-sm">
            You didn't make a prediction — that's {formatBeers(BEER_NO_BET)}
          </p>
        </div>
      );
    }

    if (isCorrect === null) {
      return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-center">
          <p className="text-sm text-foreground/50">Voting is locked</p>
          <p className="mt-2 font-medium">
            Your prediction:{" "}
            <strong>
              {outcomeLabel(currentVote, homeCountry, awayCountry)}
            </strong>
          </p>
          <p className="mt-1 text-sm text-foreground/50">Pending result</p>
        </div>
      );
    }

    if (isCorrect) {
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-emerald-700 dark:text-emerald-300">
          <p className="text-lg font-semibold">Correct</p>
          <p className="mt-1 text-sm">
            You picked{" "}
            <strong>
              {outcomeLabel(currentVote, homeCountry, awayCountry)}
            </strong>{" "}
            — {formatBeers(points)}
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-700 dark:text-red-300">
        <p className="text-lg font-semibold">Wrong</p>
        <p className="mt-1 text-sm">
          You picked{" "}
          <strong>{outcomeLabel(currentVote, homeCountry, awayCountry)}</strong>{" "}
          — {formatBeers(points)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {currentVote ? "Change your prediction" : "Place your vote"}
      </h3>
      <p className="text-sm text-foreground/50">
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
            aria-label={`Vote: ${outcomeLabel(outcome, homeCountry, awayCountry)}`}
            className={`cursor-pointer rounded-xl border p-4 text-center transition ${
              currentVote === outcome
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "border-foreground/10 bg-foreground/5 hover:border-emerald-500/50 hover:bg-foreground/10"
            }`}
          >
            <div className="font-semibold">
              {outcomeLabel(outcome, homeCountry, awayCountry)}
            </div>
          </button>
        ))}
      </div>
      {castVote.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {castVote.error.message}
        </p>
      )}
      {currentVote && (
        <p className="text-center text-sm text-foreground/50">
          You can change your vote until 5 minutes before kickoff
        </p>
      )}
    </div>
  );
}
