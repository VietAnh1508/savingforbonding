"use client";

import Link from "next/link";

import { MatchStatusBadge } from "~/app/_components/match-status-badge";
import { MatchVoteCounts } from "~/app/_components/match-vote-counts";
import { RatioDisplay } from "~/app/_components/ratio-display";
import { TeamFlag } from "~/app/_components/team-flag";
import { formatBeers, formatKickoffTime } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

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
}: {
  isSignedIn: boolean;
  isCompleted: boolean;
  voteResult: VoteResult;
  prediction: Match["userVoteOutcome"];
  homeCountry: string;
  awayCountry: string;
  voteCounts: Match["voteCounts"];
}) {
  if (isSignedIn && isCompleted && voteResult) {
    if (voteResult.isCorrect === null) {
      return <p className="text-center text-xs text-foreground/50">Pending result</p>;
    }
    if (voteResult.isCorrect) {
      return (
        <p className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Correct — {formatBeers(voteResult.points)}
        </p>
      );
    }
    return (
      <p className="text-center text-xs font-medium text-red-600 dark:text-red-400">
        Wrong — {formatBeers(voteResult.points)}
      </p>
    );
  }

  if (isSignedIn && isCompleted && !prediction) {
    return (
      <p className="text-center text-xs font-medium text-amber-600 dark:text-amber-400">
        No pick — {formatBeers(2)}
      </p>
    );
  }

  return <MatchVoteCounts homeCountry={homeCountry} awayCountry={awayCountry} voteCounts={voteCounts} />;
}

function predictedTeamClass(isPredicted: boolean) {
  return isPredicted
    ? "rounded-full border-2 border-emerald-400 px-3 py-2"
    : "px-3 py-2";
}

function formatMatchScore(match: Match): string {
  if (
    match.homeScore !== null &&
    match.awayScore !== null &&
    (match.status === "LIVE" || match.status === "COMPLETED")
  ) {
    return `${match.homeScore} - ${match.awayScore}`;
  }

  return "vs";
}

export function MatchCard({ match, isSignedIn = false }: { match: Match; isSignedIn?: boolean }) {
  const prediction = match.userVoteOutcome;
  const predictsHomeWin = prediction === "HOME_WIN";
  const predictsAwayWin = prediction === "AWAY_WIN";
  const predictsDraw = prediction === "DRAW";
  const scoreIsTbd = formatMatchScore(match) === "vs";
  const isCompleted = match.status === "COMPLETED";
  const voteResult = match.userVoteResult;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-xl border border-foreground/10 bg-foreground/5 p-4 transition hover:border-emerald-500/30 hover:bg-foreground/10"
    >
      <div className="mb-3 flex items-center justify-between">
        <MatchStatusBadge status={match.status} />
        <span className="text-xs text-foreground/50">
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

        <div className="flex min-w-[6.5rem] flex-col items-center gap-1">
          <span
            className={`text-xl font-bold ${
              scoreIsTbd ? "text-foreground/40" : ""
            }`}
          >
            {formatMatchScore(match)}
          </span>
          <RatioDisplay homeRatio={match.homeRatio} awayRatio={match.awayRatio} />
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
        />
      </div>
    </Link>
  );
}
