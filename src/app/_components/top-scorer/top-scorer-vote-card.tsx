"use client";

import { useState } from "react";

import { SignInPrompt } from "~/app/_components/sign-in-prompt";
import { StarIcon } from "~/app/_components/icons/star-icon";
import {
  formatBeers,
  MIN_STAR_MULTIPLIER,
  TOP_SCORER_VOTE_BONUS,
} from "~/lib/match";
import { api } from "~/trpc/react";
import { useToast } from "../toast";
import { TopScorerVoteItem } from "./top-scorer-vote-item";

function TopScorerStakesBanner({
  maxStarMultiplier,
}: {
  maxStarMultiplier: number;
}) {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-foreground/70">
      <h3 className="mb-2 font-semibold text-violet-700 dark:text-violet-300">
        ⚽ Top scorer stakes
      </h3>
      <ul className="space-y-1.5">
        <li>
          <span className="font-medium text-emerald-600 dark:text-emerald-300">
            Pick right
          </span>{" "}
          — {formatBeers(TOP_SCORER_VOTE_BONUS)} come off your tab.
        </li>
        <li>
          <span className="font-medium text-red-600 dark:text-red-400">
            Pick wrong
          </span>{" "}
          — {formatBeers(TOP_SCORER_VOTE_BONUS)} go on your tab.
        </li>
        <li>
          <span className="font-medium text-foreground/80">No pick</span> —
          no penalty either way.
        </li>
        <li className="text-foreground/50">
          Ties break by most goals, then most assists, then fewest minutes
          played — still level after that, it&apos;s a shared award. (follows
          FIFA rule)
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
            {formatBeers(TOP_SCORER_VOTE_BONUS * maxStarMultiplier)} max swing).
          </p>
        </>
      )}
    </div>
  );
}

export function TopScorerVoteCard({ isSignedIn }: { isSignedIn: boolean }) {
  const utils = api.useUtils();
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: voteCounts } = api.topScorerVote.getVoteCounts.useQuery();
  const { data: myVote } = api.topScorerVote.getMyVote.useQuery(undefined, {
    enabled: isSignedIn,
  });
  const { data: votingStatus } = api.topScorerVote.getVotingStatus.useQuery();

  const castVote = api.topScorerVote.cast.useMutation({
    onSuccess: () => {
      toast.success("Top scorer pick saved!");
    },
    onSettled: () => {
      void utils.topScorerVote.getMyVote.invalidate();
      void utils.topScorerVote.getVoteCounts.invalidate();
    },
  });

  const setStar = api.topScorerVote.setStar.useMutation({
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
      void utils.topScorerVote.getMyVote.invalidate();
    },
  });

  const votingOpen = votingStatus?.isOpen ?? true;
  const maxStarMultiplier = votingStatus?.maxStarMultiplier ?? 0;
  const selectedCandidateId = myVote?.candidateId;

  if (!voteCounts?.length) {
    return (
      <div className="space-y-4">
        <TopScorerStakesBanner maxStarMultiplier={maxStarMultiplier} />
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-center text-sm text-foreground/50">
          Top scorer candidates haven&apos;t synced yet — check back soon.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TopScorerStakesBanner maxStarMultiplier={maxStarMultiplier} />
      {!votingOpen && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-amber-700 dark:text-amber-300">
          <p className="font-medium">Voting is locked</p>
          <p className="mt-1 text-sm">
            {selectedCandidateId
              ? "Your top scorer pick is locked in."
              : "You didn't pick a top scorer before the Play-off for third place kicked off."}
          </p>
          <p className="mt-1 text-sm">
            The result will be resolved after the final match.
          </p>
        </div>
      )}
      <div
        className={`divide-y divide-foreground/10 overflow-hidden rounded-xl border border-foreground/10 ${
          votingOpen ? "" : "opacity-60"
        }`}
      >
        {voteCounts.map(({ candidate, count, voters }) => {
          const selected = selectedCandidateId === candidate.id;
          const isVotingForThis =
            castVote.isPending &&
            castVote.variables?.candidateId === candidate.id;
          const expanded = expandedId === candidate.id;
          return (
            <TopScorerVoteItem
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
              onSelectStar={(multiplier) => setStar.mutate({ multiplier })}
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
      {!isSignedIn && <SignInPrompt action="to vote for the top scorer" />}
    </div>
  );
}
