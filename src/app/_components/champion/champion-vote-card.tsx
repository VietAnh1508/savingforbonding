"use client";

import { TeamFlag } from "~/app/_components/match/team-flag";
import { SignInPrompt } from "~/app/_components/sign-in-prompt";
import { CHAMPION_VOTE_BONUS, formatBeers, voterLabel } from "~/lib/match";
import { api } from "~/trpc/react";
import { useToast } from "../toast";

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
          Quarter-Final teams haven&apos;t been confirmed yet — check back
          once the Round of 16 wraps up.
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
          !isSignedIn || !votingOpen || castVote.isPending ? "opacity-60" : ""
        }`}
      >
        {voteCounts.map(({ candidate, count }) => {
          const selected = selectedCandidateId === candidate.id;
          return (
            <button
              key={candidate.id}
              type="button"
              disabled={!isSignedIn || !votingOpen || castVote.isPending}
              onClick={() => castVote.mutate({ candidateId: candidate.id })}
              aria-label={`Pick ${candidate.teamName} as champion`}
              className={`flex w-full cursor-pointer items-center gap-3 p-4 text-left font-medium transition disabled:cursor-not-allowed ${
                selected
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-foreground/5 hover:bg-foreground/10"
              }`}
            >
              <TeamFlag country={candidate.teamName} size="md" />
              <span className="flex-1">{candidate.teamName}</span>
              <span className="text-sm font-normal text-foreground/50">
                {voterLabel(count)}
              </span>
            </button>
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
