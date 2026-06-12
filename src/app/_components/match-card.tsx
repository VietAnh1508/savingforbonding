import Link from "next/link";

import { MatchVoteCounts } from "~/app/_components/match-vote-counts";
import { TeamFlag } from "~/app/_components/team-flag";
import { formatKickoffTime, formatRatioValue } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type Match = RouterOutputs["match"]["listUpcoming"][number];

function predictedTeamClass(isPredicted: boolean) {
  return isPredicted
    ? "rounded-full border-2 border-emerald-400 px-3 py-2"
    : "px-3 py-2";
}

function statusLabel(status: Match["status"]): string {
  if (status === "SCHEDULED") return "UP COMING";
  return status;
}

function statusBadge(status: Match["status"]) {
  const styles: Record<Match["status"], string> = {
    SCHEDULED: "bg-blue-500/20 text-blue-300",
    LIVE: "bg-red-500/20 text-red-300 animate-pulse",
    COMPLETED: "bg-gray-500/20 text-gray-300",
    POSTPONED: "bg-yellow-500/20 text-yellow-300",
    CANCELLED: "bg-gray-500/20 text-gray-400",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function formatMatchScore(match: Match): string {
  if (
    match.homeScore !== null &&
    match.awayScore !== null &&
    (match.status === "LIVE" || match.status === "COMPLETED")
  ) {
    return `${match.homeScore} - ${match.awayScore}`;
  }

  return "TBD - TBD";
}

export function MatchCard({ match }: { match: Match }) {
  const prediction = match.userVoteOutcome;
  const predictsHomeWin = prediction === "HOME_WIN";
  const predictsAwayWin = prediction === "AWAY_WIN";
  const predictsDraw = prediction === "DRAW";
  const scoreIsTbd = formatMatchScore(match) === "TBD - TBD";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-500/30 hover:bg-white/10"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-white/50">{match.tournament}</span>
        {statusBadge(match.status)}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div
          className={`flex flex-1 flex-col items-center gap-1 text-center ${predictedTeamClass(predictsHomeWin)}`}
        >
          <TeamFlag country={match.homeCountry} size="sm" />
          <span className="text-sm font-medium">{match.homeCountry}</span>
          {predictsHomeWin && (
            <span className="text-xs font-medium text-emerald-400">
              predict win
            </span>
          )}
        </div>

        <div className="flex min-w-[6.5rem] flex-col items-center gap-1">
          <span
            className={`text-xl font-bold ${
              scoreIsTbd ? "text-white/40" : "text-white"
            }`}
          >
            {formatMatchScore(match)}
          </span>
          <span className="font-mono text-xs text-emerald-400/80">
            {formatRatioValue(match.homeRatio)}/
            {formatRatioValue(match.awayRatio)}
          </span>
          {predictsDraw && (
            <span className="text-xs font-medium text-emerald-400">
              predict draw
            </span>
          )}
          <span className="text-xs text-white/50">
            {formatKickoffTime(match.kickoffAt)}
          </span>
        </div>

        <div
          className={`flex flex-1 flex-col items-center gap-1 text-center ${predictedTeamClass(predictsAwayWin)}`}
        >
          <TeamFlag country={match.awayCountry} size="sm" />
          <span className="text-sm font-medium">{match.awayCountry}</span>
          {predictsAwayWin && (
            <span className="text-xs font-medium text-emerald-400">
              predict win
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <MatchVoteCounts
          homeCountry={match.homeCountry}
          awayCountry={match.awayCountry}
          voteCounts={match.voteCounts}
        />
      </div>
    </Link>
  );
}
