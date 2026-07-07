"use client";

import { useState } from "react";

import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
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
          !isSignedIn || !votingOpen ? "opacity-60" : ""
        }`}
      >
        {voteCounts.map(({ candidate, count, voters }) => {
          const selected = selectedCandidateId === candidate.id;
          const isVotingForThis =
            castVote.isPending &&
            castVote.variables?.candidateId === candidate.id;
          const expanded = expandedId === candidate.id;
          return (
            <div key={candidate.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(expanded ? null : candidate.id)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  setExpandedId(expanded ? null : candidate.id);
                }}
                aria-expanded={expanded}
                className={`flex w-full cursor-pointer items-center gap-3 p-4 text-left font-medium transition ${
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
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 shrink-0 text-foreground/40 transition ${
                    expanded ? "rotate-180" : ""
                  }`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
                <button
                  type="button"
                  disabled={!isSignedIn || !votingOpen || castVote.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    castVote.mutate({ candidateId: candidate.id });
                  }}
                  aria-label={`Pick ${candidate.teamName} as champion`}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${
                    selected
                      ? "border border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-foreground/10 hover:bg-foreground/20"
                  }`}
                >
                  {isVotingForThis && <SpinnerIcon className="h-3 w-3" />}
                  {selected ? "Picked" : "Pick"}
                </button>
              </div>
              {expanded && (
                <div className="bg-foreground/[0.02] px-4 py-3">
                  {voters.length === 0 ? (
                    <p className="text-xs text-foreground/40">
                      No voters yet
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1">
                      {voters.map((voter) => (
                        <li
                          key={voter.id}
                          className="text-xs text-foreground/60"
                        >
                          {voter.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
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
