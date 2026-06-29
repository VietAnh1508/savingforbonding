"use client";

import { StarIcon } from "~/app/_components/icons/star-icon";
import { useToggleStar } from "~/app/hooks/use-toggle-star";
import {
  BEER_NO_BET,
  formatBeers,
  outcomeLabel,
  starsAllocatedForStage,
  wrongPenaltyForStage,
} from "~/lib/match";
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
  const matchStage = match?.stage ?? null;
  const hasStarOnThisVote = match?.userVote?.hasStar ?? false;
  const starsAllocated = starsAllocatedForStage(matchStage);

  const { data: starAllotments } = api.vote.getStarAllotments.useQuery(
    undefined,
    {
      enabled: votingOpen && !!currentVote && starsAllocated > 0,
    },
  );
  const stageAllotment = starAllotments?.find((a) => a.stage === matchStage);
  // null while the query is loading — treated as "unknown budget" so the button isn't prematurely disabled
  const starsRemaining = starAllotments
    ? (stageAllotment?.remaining ?? 0)
    : null;

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
                hasStar: false,
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

  const toggleStar = useToggleStar({
    onMutate: async () => {
      const wasStarred = hasStarOnThisVote; // capture before optimistic flip changes the cache
      await utils.match.getById.cancel({ id: matchId });
      const previous = utils.match.getById.getData({ id: matchId });
      utils.match.getById.setData({ id: matchId }, (old) => {
        if (!old?.userVote) return old;
        return {
          ...old,
          userVote: { ...old.userVote, hasStar: !old.userVote.hasStar },
        };
      });
      return { previous, wasStarred };
    },
    onSuccess: (_result, _input, ctx) => {
      const context = ctx as
        | { wasStarred: boolean; previous: MatchDetail | undefined }
        | undefined;
      toast.success(context?.wasStarred ? "Star removed" : "Star placed!");
    },
    onError: (_error, _input, ctx) => {
      const context = ctx as
        | { wasStarred: boolean; previous: MatchDetail | undefined }
        | undefined;
      if (context?.previous) {
        utils.match.getById.setData({ id: matchId }, context.previous);
      }
    },
    onSettled: () => {
      void utils.match.getById.invalidate({ id: matchId });
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

    const hasStar = userVote?.hasStar ?? false;

    if (isCorrect === null) {
      return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-center">
          <p className="text-sm text-foreground/50">Voting is locked</p>
          <p className="mt-2 flex items-center justify-center gap-1.5 font-medium">
            {hasStar && (
              <span className="text-amber-500 dark:text-amber-400">
                <StarIcon filled />
              </span>
            )}
            <span>
              Your prediction:{" "}
              <strong>
                {outcomeLabel(currentVote, homeCountry, awayCountry)}
              </strong>
            </span>
          </p>
          <p className="mt-1 text-sm text-foreground/50">Pending result</p>
        </div>
      );
    }

    if (isCorrect) {
      const display =
        points < 0 ? `cleared ${formatBeers(-points)}` : formatBeers(points);
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-emerald-700 dark:text-emerald-300">
          <p className="flex items-center justify-center gap-1.5 text-lg font-semibold">
            {hasStar && (
              <span className="text-amber-500 dark:text-amber-400">
                <StarIcon filled />
              </span>
            )}
            Correct
          </p>
          <p className="mt-1 text-sm">
            You picked{" "}
            <strong>
              {outcomeLabel(currentVote, homeCountry, awayCountry)}
            </strong>{" "}
            — {display}
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-700 dark:text-red-300">
        <p className="flex items-center justify-center gap-1.5 text-lg font-semibold">
          {hasStar && (
            <span className="text-amber-500 dark:text-amber-400">
              <StarIcon filled />
            </span>
          )}
          Wrong
        </p>
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
      {currentVote && starsAllocated > 0 && (
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {hasStarOnThisVote && (
                  <span className="text-amber-500 dark:text-amber-400">
                    <StarIcon filled />
                  </span>
                )}
                {hasStarOnThisVote ? "Starred" : "Star of Hope"}
              </p>
              <p className="mt-0.5 text-xs text-foreground/50">
                {hasStarOnThisVote
                  ? "Double risk, double reward"
                  : `Right: clear ${formatBeers(wrongPenaltyForStage(matchStage) * 2)}. Wrong: double penalty`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <button
                type="button"
                disabled={
                  toggleStar.isPending ||
                  (!hasStarOnThisVote &&
                    starsRemaining !== null &&
                    starsRemaining === 0)
                }
                onClick={() => toggleStar.mutate({ matchId })}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  hasStarOnThisVote
                    ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    : starsRemaining === null || starsRemaining > 0
                      ? "border-foreground/10 bg-foreground/5 hover:border-amber-500/50 hover:bg-amber-500/10"
                      : "cursor-not-allowed border-foreground/10 bg-foreground/5 opacity-40"
                }`}
              >
                {hasStarOnThisVote ? (
                  "Remove"
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="text-amber-500 dark:text-amber-400">
                      <StarIcon filled />
                    </span>
                    Star it
                  </span>
                )}
              </button>
              <span className="text-xs text-foreground/40">
                {starsRemaining === null
                  ? "..."
                  : `${starsRemaining} star${starsRemaining === 1 ? "" : "s"} remaining`}
              </span>
            </div>
          </div>
        </div>
      )}
      {toggleStar.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {toggleStar.error.message}
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

