"use client";

import { useState } from "react";

import { SignInPrompt } from "~/app/_components/sign-in-prompt";
import { StarIcon } from "~/app/_components/icons/star-icon";
import { CHAMPION_VOTE_BONUS, formatBeers, MIN_STAR_MULTIPLIER } from "~/lib/match";
import { api } from "~/trpc/react";
import { useToast } from "../toast";
import { ChampionVoteItem } from "./champion-vote-item";

function ChampionStakesBanner({ maxStarMultiplier }: { maxStarMultiplier: number }) {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-foreground/70">
      <h3 className="mb-2 font-semibold text-violet-700 dark:text-violet-300">
        🏆 Champion stakes
      </h3>
      <ul className="space-y-1.5">
        <li>
          <span className="font-medium text-emerald-600 dark:text-emerald-300">
            Pick right
          </span>{" "}
          — {formatBeers(CHAMPION_VOTE_BONUS)} come off your tab.
        </li>
        <li>
          <span className="font-medium text-red-600 dark:text-red-400">
            Pick wrong
          </span>{" "}
          — {formatBeers(CHAMPION_VOTE_BONUS)} go on your tab.
        </li>
        <li>
          <span className="font-medium text-foreground/80">No pick</span> —
          no penalty either way.
        </li>
        <li>
          <span className="font-medium text-orange-600 dark:text-orange-400">
            Your pick gets eliminated
          </span>{" "}
          — pick again from the teams still standing.
        </li>
      </ul>
      {maxStarMultiplier >= MIN_STAR_MULTIPLIER && (
        <>
          <hr className="my-2.5 border-violet-500/20" />
          <p className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <StarIcon filled /> Place a star
            </span>
            — choose ×{MIN_STAR_MULTIPLIER} up to ×{maxStarMultiplier} stakes (
            {formatBeers(CHAMPION_VOTE_BONUS * maxStarMultiplier)} max swing).
          </p>
        </>
      )}
    </div>
  );
}

export function ChampionVoteCard({ isSignedIn }: { isSignedIn: boolean }) {
  const utils = api.useUtils();
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { data: voteCounts } = api.championVote.getVoteCounts.useQuery();
  const { data: myVote } = api.championVote.getMyVote.useQuery(undefined, {
    enabled: isSignedIn,
  });
  const { data: votingStatus } = api.championVote.getVotingStatus.useQuery();

  const castVote = api.championVote.cast.useMutation({
    onSuccess: () => {
      toast.success("Champion pick saved!");
    },
    onSettled: () => {
      void utils.championVote.getMyVote.invalidate();
      void utils.championVote.getVoteCounts.invalidate();
    },
  });

  const setStar = api.championVote.setStar.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.starMultiplier
          ? `Star placed at ×${data.starMultiplier}!`
          : "Star removed",
      );
    },
    onError: () => {
      toast.error("Couldn't update star");
    },
    onSettled: () => {
      void utils.championVote.getMyVote.invalidate();
    },
  });

  const votingOpen = votingStatus?.isOpen ?? true;
  const maxStarMultiplier = votingStatus?.maxStarMultiplier ?? 0;
  const selectedCandidateId = myVote?.candidateId;
  const pickWasEliminated = !!myVote && !myVote.candidateId;

  if (!voteCounts?.length) {
    return (
      <div className="space-y-4">
        <ChampionStakesBanner maxStarMultiplier={maxStarMultiplier} />
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-center text-sm text-foreground/50">
          Semi-Final teams haven&apos;t been confirmed yet — check back once
          the Quarter-Finals wrap up.
        </div>
      </div>
    );
  }

  const visibleCandidates = showAll
    ? voteCounts
    : voteCounts.filter(({ candidate }) => !candidate.eliminatedAt);

  return (
    <div className="space-y-4">
      <ChampionStakesBanner maxStarMultiplier={maxStarMultiplier} />
      {votingOpen && pickWasEliminated && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-700 dark:text-red-300">
          <p className="font-medium">Your pick was eliminated</p>
          <p className="mt-1 text-sm">
            Choose a new team below to stay in the running.
          </p>
        </div>
      )}
      {!votingOpen && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-amber-700 dark:text-amber-300">
          <p className="font-medium">Voting is locked</p>
          <p className="mt-1 text-sm">
            {selectedCandidateId
              ? "Your champion pick is locked in."
              : "You didn't pick a champion before the Semi-Finals kicked off."}
          </p>
          <p className="mt-1 text-sm">
            The result will be resolved after the final match.
          </p>
        </div>
      )}
      <div className="flex items-center justify-end">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground/60">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-foreground/30 accent-violet-600"
          />
          Show all candidates
        </label>
      </div>
      <div
        className={`divide-y divide-foreground/10 overflow-hidden rounded-xl border border-foreground/10 ${
          votingOpen ? "" : "opacity-60"
        }`}
      >
        {visibleCandidates.map(({ candidate, count, voters }) => {
          const selected = selectedCandidateId === candidate.id;
          const isVotingForThis =
            castVote.isPending &&
            castVote.variables?.candidateId === candidate.id;
          const expanded = expandedId === candidate.id;
          return (
            <ChampionVoteItem
              key={candidate.id}
              candidate={candidate}
              count={count}
              voters={voters}
              selected={selected}
              isVotingForThis={isVotingForThis}
              expanded={expanded}
              onToggleExpand={() =>
                setExpandedId(expanded ? null : candidate.id)
              }
              onVote={() => castVote.mutate({ candidateId: candidate.id })}
              isSignedIn={isSignedIn}
              votingOpen={votingOpen}
              isCastPending={castVote.isPending}
              starMultiplier={selected ? (myVote?.starMultiplier ?? null) : null}
              maxStarMultiplier={maxStarMultiplier}
              onPlaceStar={() => setStar.mutate({ multiplier: MIN_STAR_MULTIPLIER })}
              onRemoveStar={() => setStar.mutate({ multiplier: null })}
              onChangeStarMultiplier={(multiplier) => setStar.mutate({ multiplier })}
              isSettingStar={setStar.isPending}
            />
          );
        })}
      </div>
      {castVote.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {castVote.error.message}
        </p>
      )}
      {setStar.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {setStar.error.message}
        </p>
      )}
      {!isSignedIn && <SignInPrompt action="to vote for the champion" />}
    </div>
  );
}
