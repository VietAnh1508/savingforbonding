"use client";

import { useState } from "react";
import { AllInIcon } from "~/app/_components/icons/all-in-icon";
import { MatchStatusBadge } from "~/app/_components/match-status-badge";
import { MatchScore } from "~/app/_components/match/match-score";
import { MatchVoteCounts } from "~/app/_components/match/match-vote-counts";
import { RatioDisplay } from "~/app/_components/match/ratio-display";
import { TeamFlag } from "~/app/_components/match/team-flag";
import { AllInCheckbox, StarBadge, StarPicker } from "~/app/_components/star-picker";
import { useSetAllIn } from "~/app/hooks/use-set-all-in";
import { useSetStar } from "~/app/hooks/use-set-star";
import { formatKickoffTime } from "~/lib/datetime";
import { formatBeers, hasVotingHandicap } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Match = RouterOutputs["match"]["listMatches"][number];

type VoteResult = Match["userVoteResult"];

function MatchCardFooter({
  isSignedIn,
  isCompleted,
  voteResult,
  prediction,
  homeCountry,
  awayCountry,
  voteCounts,
  stageNoVotePenalty,
}: {
  isSignedIn: boolean;
  isCompleted: boolean;
  voteResult: VoteResult;
  prediction: Match["userVoteOutcome"];
  homeCountry: string;
  awayCountry: string;
  voteCounts: Match["voteCounts"];
  stageNoVotePenalty: number;
}) {
  if (isSignedIn && isCompleted && voteResult) {
    const starIcon = voteResult.isAllIn ? (
      <AllInIcon />
    ) : voteResult.starMultiplier ? (
      <StarBadge multiplier={voteResult.starMultiplier} />
    ) : null;

    if (voteResult.isCorrect === null) {
      return (
        <p className="flex items-center justify-center gap-1 text-xs text-foreground/50">
          {starIcon}
          Pending result
        </p>
      );
    }
    if (voteResult.isCorrect) {
      const display =
        voteResult.points < 0
          ? `cleared ${formatBeers(-voteResult.points)}`
          : formatBeers(voteResult.points);
      return (
        <p className="flex items-center justify-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {starIcon}
          Correct — {display}
        </p>
      );
    }
    return (
      <p className="flex items-center justify-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        {starIcon}
        Wrong — {formatBeers(voteResult.points)}
      </p>
    );
  }

  if (isSignedIn && isCompleted && !prediction) {
    return (
      <p className="text-center text-xs font-medium text-amber-600 dark:text-amber-400">
        No pick — {formatBeers(stageNoVotePenalty)}
      </p>
    );
  }

  return (
    <MatchVoteCounts
      homeCountry={homeCountry}
      awayCountry={awayCountry}
      voteCounts={voteCounts}
    />
  );
}

function predictedTeamClass(isPredicted: boolean) {
  return isPredicted
    ? "rounded-full border-2 border-emerald-400 px-3 py-2"
    : "px-3 py-2";
}

function canToggleStar({
  starTogglePossible,
  isStarred,
  starAllotmentsLoaded,
  starsRemaining,
}: {
  starTogglePossible: boolean;
  isStarred: boolean;
  starAllotmentsLoaded: boolean;
  starsRemaining: number | null;
}) {
  if (!starTogglePossible) return false;
  if (isStarred) return true;
  if (!starAllotmentsLoaded) return false;
  return starsRemaining === null || starsRemaining > 0;
}

export function MatchCard({
  match,
  isSignedIn = false,
  onOpen,
}: {
  match: Match;
  isSignedIn?: boolean;
  onOpen: (matchId: string) => void;
}) {
  const prediction = match.userVoteOutcome;
  const predictsHomeWin = prediction === "HOME_WIN";
  const predictsAwayWin = prediction === "AWAY_WIN";
  const predictsDraw = prediction === "DRAW";
  const isCompleted = match.status === "COMPLETED";
  const voteResult = match.userVoteResult;

  // Star — interactive when voting is open and user has a saved vote.
  const currentMultiplier = voteResult?.starMultiplier ?? null;
  const [multiplierOverride, setMultiplierOverride] = useState<
    number | null | undefined
  >(undefined);
  const activeMultiplier =
    multiplierOverride !== undefined ? multiplierOverride : currentMultiplier;
  const isStarred = activeMultiplier != null;
  const starTogglePossible =
    isSignedIn &&
    match.votingOpen &&
    !!prediction &&
    match.stageStarsAllocated > 0;
  const { data: starAllotments } = api.vote.getStarAllotments.useQuery(
    undefined,
    {
      enabled: starTogglePossible,
    },
  );
  const starsRemaining =
    starAllotments?.find((a) => a.stage === match.stage)?.remaining ?? null;
  const isStarToggleAllowed = canToggleStar({
    starTogglePossible,
    isStarred,
    starAllotmentsLoaded: starAllotments !== undefined,
    starsRemaining,
  });
  const showStar = isStarred || isStarToggleAllowed;

  // All in — interactive when voting is open, user has a saved vote, and
  // the stage allows it. Mutually exclusive with the star, both locally
  // (optimistic) and server-side (each mutation clears the other field).
  const currentIsAllIn = voteResult?.isAllIn ?? false;
  const [allInOverride, setAllInOverride] = useState<boolean | undefined>(
    undefined,
  );
  const activeIsAllIn =
    allInOverride !== undefined ? allInOverride : currentIsAllIn;
  const allInTogglePossible =
    isSignedIn &&
    match.votingOpen &&
    !!prediction &&
    match.stageAllInEnabled;
  const showAllIn = activeIsAllIn || allInTogglePossible;

  const utils = api.useUtils();
  const setStar = useSetStar({
    onMutate: (variables) => {
      setMultiplierOverride(variables.multiplier);
      if (variables.multiplier !== null) setAllInOverride(false);
    },
    onError: () => setMultiplierOverride(undefined),
    onSettled: () => void utils.match.listMatches.invalidate(),
  });
  const setAllIn = useSetAllIn({
    onMutate: (variables) => {
      setAllInOverride(variables.isAllIn);
      if (variables.isAllIn) setMultiplierOverride(null);
    },
    onError: () => setAllInOverride(undefined),
    onSettled: () => void utils.match.listMatches.invalidate(),
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(match.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(match.id);
        }
      }}
      className="block cursor-pointer rounded-xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-emerald-500/30 hover:bg-foreground/10"
    >
      <div className="mb-3 flex items-center justify-between">
        <MatchStatusBadge status={match.status} />
        <span className="flex items-center gap-1.5 text-xs text-foreground/50">
          {showStar &&
            (isStarToggleAllowed ? (
              <StarPicker
                multiplier={activeMultiplier}
                maxMultiplier={match.stageMaxStarMultiplier}
                disabled={
                  setStar.isPending ||
                  (activeMultiplier === null &&
                    starsRemaining !== null &&
                    starsRemaining === 0)
                }
                onSelect={(multiplier) =>
                  setStar.mutate({ matchId: match.id, multiplier })
                }
                starClassName="h-3.5 w-3.5"
              />
            ) : (
              activeMultiplier !== null && (
                <StarBadge multiplier={activeMultiplier} />
              )
            ))}
          {formatKickoffTime(match.kickoffAt)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-center ${predictedTeamClass(predictsHomeWin)}`}
        >
          <TeamFlag country={match.homeCountry} code={match.homeCountryCode} size="sm" />
          <span className="text-sm font-medium">{match.homeCountry}</span>
          {predictsHomeWin && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              predict win
            </span>
          )}
        </div>

        <div
          className={`flex min-w-[6.5rem] flex-col items-center gap-1 ${predictedTeamClass(predictsDraw)}`}
        >
          <MatchScore
            homeScore={match.homeScore}
            awayScore={match.awayScore}
            homePenaltyScore={match.homePenaltyScore}
            awayPenaltyScore={match.awayPenaltyScore}
            status={match.status}
          />
          <RatioDisplay
            homeRatio={match.homeRatio}
            awayRatio={match.awayRatio}
          />
          {!hasVotingHandicap(match.homeRatio, match.awayRatio) && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              No handicap set
            </span>
          )}
          {showAllIn &&
            (allInTogglePossible ? (
              <AllInCheckbox
                checked={activeIsAllIn}
                disabled={setAllIn.isPending}
                onChange={(next) =>
                  setAllIn.mutate({ matchId: match.id, isAllIn: next })
                }
              />
            ) : (
              activeIsAllIn && <AllInIcon />
            ))}
          {predictsDraw && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              predict draw
            </span>
          )}
        </div>

        <div
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-center ${predictedTeamClass(predictsAwayWin)}`}
        >
          <TeamFlag country={match.awayCountry} code={match.awayCountryCode} size="sm" />
          <span className="text-sm font-medium">{match.awayCountry}</span>
          {predictsAwayWin && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              predict win
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-foreground/10 pt-3">
        <MatchCardFooter
          isSignedIn={isSignedIn}
          isCompleted={isCompleted}
          voteResult={voteResult}
          prediction={prediction}
          homeCountry={match.homeCountry}
          awayCountry={match.awayCountry}
          voteCounts={match.voteCounts}
          stageNoVotePenalty={match.stageNoVotePenalty}
        />
      </div>
    </div>
  );
}
