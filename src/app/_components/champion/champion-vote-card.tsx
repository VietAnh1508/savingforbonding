"use client";

import { useState } from "react";

import { SignInPrompt } from "~/app/_components/sign-in-prompt";
import { CHAMPION_VOTE_BONUS, formatBeers } from "~/lib/match";
import { api } from "~/trpc/react";
import { useToast } from "../toast";
import { ChampionVoteItem } from "./champion-vote-item";

function ChampionStakesBanner() {
  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-foreground/70">
      <h3 className="mb-1 font-semibold text-violet-700 dark:text-violet-300">
        🏆 Champion stakes
      </h3>
      <p>
        <span className="text-emerald-600 dark:text-emerald-300">
          Pick the champion right
        </span>{" "}
        and {formatBeers(CHAMPION_VOTE_BONUS)} come off your tab.{" "}
        <span className="text-red-600 dark:text-red-400">Pick wrong</span> and
        it&apos;s {formatBeers(CHAMPION_VOTE_BONUS)} more. No penalty if you
        skip the pick entirely.
      </p>
    </div>
  );
}

export function ChampionVoteCard({ isSignedIn }: { isSignedIn: boolean }) {
  const utils = api.useUtils();
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const votingOpen = votingStatus?.isOpen ?? true;
  const selectedCandidateId = myVote?.candidateId;

  if (!voteCounts?.length) {
    return (
      <div className="space-y-4">
        <ChampionStakesBanner />
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-center text-sm text-foreground/50">
          Quarter-Final teams haven&apos;t been confirmed yet — check back once
          the Round of 16 wraps up.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ChampionStakesBanner />
      {!votingOpen && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-amber-700 dark:text-amber-300">
          <p className="font-medium">Voting is locked</p>
          <p className="mt-1 text-sm">
            {selectedCandidateId
              ? "Your champion pick is locked in."
              : "You didn't pick a champion before the Semi-Finals kicked off."}
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
            />
          );
        })}
      </div>
      {castVote.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {castVote.error.message}
        </p>
      )}
      {!isSignedIn && <SignInPrompt action="to vote for the champion" />}
    </div>
  );
}
