"use client";

import { OutcomePicker } from "~/app/_components/match/outcome-picker";
import { StarBadge, StarPicker } from "~/app/_components/star-picker";
import { useSetStar } from "~/app/hooks/use-set-star";
import {
  BEER_NO_VOTE,
  formatBeers,
  MIN_STAR_MULTIPLIER,
  outcomeLabel,
} from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";
import { useToast } from "../toast";

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
  const currentMultiplier = match?.userVote?.starMultiplier ?? null;
  const starsAllocated = match?.stageStarsAllocated ?? 0;
  const stageMaxStarMultiplier = match?.stageMaxStarMultiplier ?? 0;

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
                starTier: null,
                starMultiplier: null,
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

  const setStar = useSetStar({
    onMutate: async ({ multiplier }) => {
      await utils.match.getById.cancel({ id: matchId });
      const previous = utils.match.getById.getData({ id: matchId });
      utils.match.getById.setData({ id: matchId }, (old) => {
        if (!old?.userVote) return old;
        return {
          ...old,
          userVote: { ...old.userVote, starMultiplier: multiplier },
        };
      });
      return { previous };
    },
    onSuccess: (_result, variables) => {
      toast.success(
        variables.multiplier === null
          ? "Star removed"
          : `Star placed at ×${variables.multiplier}!`,
      );
    },
    onError: (_error, _input, ctx) => {
      const context = ctx as { previous: MatchDetail | undefined } | undefined;
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
            You didn't make a prediction — that's{" "}
            {formatBeers(match?.stageNoVotePenalty ?? BEER_NO_VOTE)}
          </p>
        </div>
      );
    }

    const starMultiplier = userVote?.starMultiplier ?? null;
    const starIcon = starMultiplier && <StarBadge multiplier={starMultiplier} />;

    if (isCorrect === null) {
      return (
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-center">
          <p className="text-sm text-foreground/50">Voting is locked</p>
          <p className="mt-2 flex items-center justify-center gap-1.5 font-medium">
            {starIcon}
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
            {starIcon}
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
          {starIcon}
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
        {formatBeers(match?.stageNoVotePenalty ?? BEER_NO_VOTE)} anyway.
      </p>
      <OutcomePicker
        homeCountry={homeCountry}
        awayCountry={awayCountry}
        selectedOutcome={currentVote}
        onSelect={(outcome) => castVote.mutate({ matchId, outcome })}
        disabled={castVote.isPending}
      />
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
                {currentMultiplier && <StarBadge multiplier={currentMultiplier} />}
                {currentMultiplier ? "Starred" : "Star of Hope"}
              </p>
              <p className="mt-0.5 text-xs text-foreground/50">
                {currentMultiplier
                  ? `Clear ${formatBeers((match?.stageWrongPenalty ?? 0) * currentMultiplier)} at ×${currentMultiplier} stakes`
                  : `Place a star, then choose your stakes from ×${MIN_STAR_MULTIPLIER} up to ×${stageMaxStarMultiplier}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1">
              <StarPicker
                multiplier={currentMultiplier}
                maxMultiplier={stageMaxStarMultiplier}
                disabled={
                  setStar.isPending ||
                  (currentMultiplier === null &&
                    starsRemaining !== null &&
                    starsRemaining === 0)
                }
                onPlace={() =>
                  setStar.mutate({ matchId, multiplier: MIN_STAR_MULTIPLIER })
                }
                onRemove={() => setStar.mutate({ matchId, multiplier: null })}
                onChangeMultiplier={(multiplier) =>
                  setStar.mutate({ matchId, multiplier })
                }
              />
              <span className="text-xs text-foreground/40">
                {starsRemaining === null
                  ? "..."
                  : `${starsRemaining} star${starsRemaining === 1 ? "" : "s"} remaining`}
              </span>
            </div>
          </div>
        </div>
      )}
      {setStar.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {setStar.error.message}
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

