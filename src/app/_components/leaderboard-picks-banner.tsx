"use client";

import { useEffect, useState } from "react";

import { StarIcon } from "~/app/_components/icons/star-icon";
import { TeamFlag } from "~/app/_components/match/team-flag";
import { UserAvatar } from "~/app/_components/user-avatar";
import { formatKickoffTime, outcomeLabel } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Picks = RouterOutputs["leaderboard"]["bottomThreePicks"];

const COLLAPSED_STORAGE_KEY = "leaderboard-picks-banner-collapsed";

function voteKey(userId: string, matchId: string) {
  return `${userId}:${matchId}`;
}

function PickCell({
  vote,
  homeCountry,
  awayCountry,
}: {
  vote: Picks["votes"][number] | undefined;
  homeCountry: string;
  awayCountry: string;
}) {
  if (!vote) {
    return (
      <span className="text-foreground/40" title="No vote">
        –
      </span>
    );
  }

  const pickedCountry =
    vote.outcome === "HOME_WIN"
      ? homeCountry
      : vote.outcome === "AWAY_WIN"
        ? awayCountry
        : null;

  return (
    <span
      className="inline-flex items-center gap-1"
      title={outcomeLabel(vote.outcome, homeCountry, awayCountry)}
    >
      {pickedCountry ? (
        <TeamFlag country={pickedCountry} size="sm" />
      ) : (
        <span className="text-foreground/60 text-xs font-medium">Draw</span>
      )}
      {vote.hasStar && (
        <span className="text-amber-500 dark:text-amber-400">
          <StarIcon filled />
        </span>
      )}
    </span>
  );
}

export function LeaderboardPicksBanner() {
  const { data } = api.leaderboard.bottomThreePicks.useQuery();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  if (!data || data.matches.length === 0) return null;

  const { users, matches, votes } = data;
  const votesByKey = new Map(
    votes.map((v) => [voteKey(v.userId, v.matchId), v]),
  );

  return (
    <div className="mt-6 mb-6 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-foreground/70">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between font-semibold text-sky-700 dark:text-sky-300"
      >
        <span>
          🎯 What are the top predictors calling?
          <br />— today & tomorrow
        </span>
        <span className="text-foreground/40">{collapsed ? "Show" : "Hide"}</span>
      </button>

      {!collapsed && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-foreground/50">
                <th className="pb-1 pr-3 font-normal">Player</th>
                {matches.map((match) => (
                  <th
                    key={match.id}
                    className="pb-1 pr-3 text-center font-normal whitespace-nowrap"
                    title={`${match.homeCountry} vs ${match.awayCountry}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <TeamFlag country={match.homeCountry} size="sm" />
                      <span className="text-foreground/35 text-[10px]">vs</span>
                      <TeamFlag country={match.awayCountry} size="sm" />
                    </div>
                    <div className="text-foreground/35">
                      {formatKickoffTime(match.kickoffAt)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-foreground/5 last:border-0">
                  <td className="py-1.5 pr-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={user.name}
                        image={user.image}
                        size={20}
                        fallbackClassName="bg-sky-500/20 text-xs"
                      />
                      <span className="text-foreground/80">{user.name ?? "Unknown"}</span>
                    </div>
                  </td>
                  {matches.map((match) => (
                    <td
                      key={match.id}
                      className="py-1.5 pr-3 text-center whitespace-nowrap"
                    >
                      <PickCell
                        vote={votesByKey.get(voteKey(user.id, match.id))}
                        homeCountry={match.homeCountry}
                        awayCountry={match.awayCountry}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
