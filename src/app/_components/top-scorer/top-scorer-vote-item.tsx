"use client";

import { InfoIcon } from "~/app/_components/icons/info-icon";
import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { TeamFlag } from "~/app/_components/match/team-flag";
import { StarBadge, StarPicker } from "~/app/_components/star-picker";
import { Tooltip } from "~/app/_components/tooltip";
import { voterLabel } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type VoteCount = RouterOutputs["topScorerVote"]["getVoteCounts"][number];

export function TopScorerVoteItem({
  candidate,
  count,
  voters,
  selected,
  isVotingForThis,
  expanded,
  onToggleExpand,
  onVote,
  isSignedIn,
  votingOpen,
  isCastPending,
  starMultiplier,
  maxStarMultiplier,
  onSelectStar,
  isSettingStar,
}: {
  candidate: VoteCount["candidate"];
  count: VoteCount["count"];
  voters: VoteCount["voters"];
  selected: boolean;
  isVotingForThis: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onVote: () => void;
  isSignedIn: boolean;
  votingOpen: boolean;
  isCastPending: boolean;
  starMultiplier: number | null;
  maxStarMultiplier: number;
  onSelectStar: (multiplier: number | null) => void;
  isSettingStar: boolean;
}) {
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          onToggleExpand();
        }}
        aria-expanded={expanded}
        className={`flex w-full cursor-pointer items-center gap-3 p-4 text-left font-medium transition ${
          selected
            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            : "bg-foreground/5 hover:bg-foreground/10"
        }`}
      >
        <TeamFlag country={candidate.countryName} size="md" />
        <span className="flex-1">{candidate.playerName}</span>
        <span className="flex flex-col items-end gap-0.5">
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {candidate.goals} goal{candidate.goals > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-xs text-foreground/50">
              {candidate.assists} assist{candidate.assists > 1 ? "s" : ""}
            </span>
            <Tooltip label={`${candidate.minutesPlayed}' played`}>
              <InfoIcon className="h-3.5 w-3.5 text-foreground/40" />
            </Tooltip>
          </span>
        </span>
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
        {isSignedIn && (
          <button
            type="button"
            disabled={!votingOpen || isCastPending || selected}
            onClick={(e) => {
              e.stopPropagation();
              onVote();
            }}
            aria-label={`Pick ${candidate.playerName} as top scorer`}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${
              selected
                ? "border border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30"
                : "bg-foreground/10 hover:bg-foreground/20"
            }`}
          >
            {isVotingForThis && <SpinnerIcon className="h-3 w-3" />}
            {selected ? "Picked" : "Pick"}
          </button>
        )}
        {isSignedIn && selected && (
          <StarPicker
            multiplier={starMultiplier}
            maxMultiplier={maxStarMultiplier}
            disabled={!votingOpen || isSettingStar}
            onSelect={onSelectStar}
            starClassName="h-3.5 w-3.5"
          />
        )}
      </div>
      {expanded && (
        <div className="bg-foreground/[0.02] px-4 py-3">
          {voters.length === 0 ? (
            <p className="text-xs text-foreground/40">No voters yet</p>
          ) : (
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {voters.map((voter) => (
                <li
                  key={voter.id}
                  className="flex items-center gap-1 text-xs text-foreground/60"
                >
                  {voter.starMultiplier && (
                    <StarBadge multiplier={voter.starMultiplier} />
                  )}
                  {voter.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
