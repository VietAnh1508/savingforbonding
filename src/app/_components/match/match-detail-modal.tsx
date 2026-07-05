"use client";

import { CloseIcon } from "~/app/_components/icons/close-icon";
import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { MatchStatusBadge } from "~/app/_components/match-status-badge";
import { MatchScore } from "~/app/_components/match/match-score";
import { MatchVoteCounts } from "~/app/_components/match/match-vote-counts";
import { TeamFlag } from "~/app/_components/match/team-flag";
import { VoteForm } from "~/app/_components/match/vote-form";
import { VoterList } from "~/app/_components/match/voter-list";
import { VotingRatios } from "~/app/_components/match/voting-ratios";
import { useModalDismiss } from "~/app/hooks/use-modal-dismiss";
import { formatMatchDateTime } from "~/lib/match";
import { api } from "~/trpc/react";

export function MatchDetailModal({
  matchId,
  isSignedIn,
  onClose,
}: {
  matchId: string;
  isSignedIn: boolean;
  onClose: () => void;
}) {
  const {
    data: match,
    isLoading,
    error,
  } = api.match.getById.useQuery({ id: matchId });

  useModalDismiss(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-foreground/10 bg-card shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/10 bg-card px-6 py-4">
          <h2 className="text-lg font-semibold">Match details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground/50 transition hover:bg-foreground/10 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <SpinnerIcon className="h-6 w-6 text-foreground/40" />
            </div>
          )}

          {!isLoading && error && (
            <p className="py-12 text-center text-red-600 dark:text-red-400">
              Something went wrong. Please try again.
            </p>
          )}

          {!isLoading && !error && !match && (
            <p className="py-12 text-center text-foreground/50">
              Match not found.
            </p>
          )}

          {match && (
            <div className="space-y-6">
              <div>
                <div className="mb-2 text-sm text-foreground/50">
                  {match.tournament}
                </div>

                <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <MatchStatusBadge status={match.status} />
                  <time
                    dateTime={match.kickoffAt.toISOString()}
                    className="text-sm text-foreground/50"
                  >
                    {formatMatchDateTime(match.kickoffAt)}
                  </time>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div className="flex flex-1 flex-col items-center gap-3 text-center">
                    <TeamFlag country={match.homeCountry} size="md" />
                    <h3 className="text-lg font-bold">{match.homeCountry}</h3>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <MatchScore
                      homeScore={match.homeScore}
                      awayScore={match.awayScore}
                      homePenaltyScore={match.homePenaltyScore}
                      awayPenaltyScore={match.awayPenaltyScore}
                      status={match.status}
                      className="text-2xl font-bold"
                    />
                  </div>

                  <div className="flex flex-1 flex-col items-center gap-3 text-center">
                    <TeamFlag country={match.awayCountry} size="md" />
                    <h3 className="text-lg font-bold">{match.awayCountry}</h3>
                  </div>
                </div>

                <div className="mt-6 border-t border-foreground/10 pt-6">
                  <MatchVoteCounts
                    homeCountry={match.homeCountry}
                    awayCountry={match.awayCountry}
                    voteCounts={match.voteCounts}
                  />
                  {match.status === "COMPLETED" && (
                    <VoterList voters={match.voters} />
                  )}
                </div>
              </div>

              {isSignedIn ? (
                <VoteForm
                  matchId={match.id}
                  homeCountry={match.homeCountry}
                  awayCountry={match.awayCountry}
                  initialMatch={match}
                />
              ) : (
                <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6 text-center">
                  <p className="text-foreground/60">
                    <a
                      href="/auth/signin"
                      className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      Sign in
                    </a>{" "}
                    to cast your prediction
                  </p>
                </div>
              )}

              <VotingRatios
                homeCountry={match.homeCountry}
                awayCountry={match.awayCountry}
                homeRatio={match.homeRatio}
                awayRatio={match.awayRatio}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-foreground/10 bg-card px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
