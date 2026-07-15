"use client";

import { useState } from "react";
import { StarIcon } from "~/app/_components/icons/star-icon";
import { MatchStatusBadge } from "~/app/_components/match-status-badge";
import { MatchScore } from "~/app/_components/match/match-score";
import { MatchVoteCounts } from "~/app/_components/match/match-vote-counts";
import { RatioDisplay } from "~/app/_components/match/ratio-display";
import { TeamFlag } from "~/app/_components/match/team-flag";
import {
  STAR_TIERS,
  StarTierButtons,
  type StarTier,
} from "~/app/_components/star-tier-buttons";
import { useToggleStar } from "~/app/hooks/use-toggle-star";
import {
  formatBeers,
  formatKickoffTime,
  hasVotingHandicap,
  isGatedStarTier,
  starColor,
} from "~/lib/match";
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
    const starIcon = voteResult.starTier ? (
      <StarIcon filled color={starColor(voteResult.starTier)} />
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

  // Star toggle — interactive when voting is open and user has a saved vote.
  const currentTier = voteResult?.starTier ?? null;
  const [tierOverride, setTierOverride] = useState<StarTier | null | undefined>(
    undefined,
  );
  const activeTier = tierOverride !== undefined ? tierOverride : currentTier;
  const isStarred = activeTier != null;
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

  const utils = api.useUtils();
  const toggleStar = useToggleStar({
    onMutate: (variables) =>
      setTierOverride(activeTier === variables.tier ? null : variables.tier),
    onError: () => setTierOverride(undefined),
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
              <StarTierButtons
                tiers={STAR_TIERS.filter(
                  (tier) =>
                    !isGatedStarTier(tier) || match.redStarEligible || activeTier === tier,
                )}
                activeTier={activeTier}
                isTierDisabled={(tier) =>
                  toggleStar.isPending ||
                  (activeTier !== tier &&
                    activeTier === null &&
                    starsRemaining !== null &&
                    starsRemaining === 0)
                }
                onToggle={(tier) => {
                  toggleStar.mutate({ matchId: match.id, tier });
                }}
                gapClassName="gap-0.5"
              />
            ) : (
              <StarIcon filled color={starColor(activeTier)} />
            ))}
          {formatKickoffTime(match.kickoffAt)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-center ${predictedTeamClass(predictsHomeWin)}`}
        >
          <TeamFlag country={match.homeCountry} size="sm" />
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
          {predictsDraw && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              predict draw
            </span>
          )}
        </div>

        <div
          className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-center ${predictedTeamClass(predictsAwayWin)}`}
        >
          <TeamFlag country={match.awayCountry} size="sm" />
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
