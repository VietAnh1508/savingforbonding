"use client";

import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { StarIcon } from "~/app/_components/icons/star-icon";
import { TeamFlag } from "~/app/_components/match/team-flag";
import { Tooltip } from "~/app/_components/tooltip";
import { voterLabel } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type VoteCount = RouterOutputs["championVote"]["getVoteCounts"][number];
type StarTier = "YELLOW" | "RED";

export function ChampionVoteItem({
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
  starTier,
  onToggleStar,
  isTogglingStar,
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
  starTier: StarTier | null;
  onToggleStar: (tier: StarTier) => void;
  isTogglingStar: boolean;
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
        {isSignedIn && (
          <button
            type="button"
            disabled={!votingOpen || isCastPending}
            onClick={(e) => {
              e.stopPropagation();
              onVote();
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
        )}
        {isSignedIn && selected && (
          <div className="flex items-center gap-1.5">
            {(["YELLOW", "RED"] as const).map((tier) => {
              const active = starTier === tier;
              const color = tier === "YELLOW" ? "yellow" : "red";
              return (
                <Tooltip
                  key={tier}
                  label={`${active ? "Remove" : "Apply"} ${
                    tier === "YELLOW" ? "yellow star (2x)" : "red star (4x)"
                  }`}
                >
                  <button
                    type="button"
                    disabled={!votingOpen || isTogglingStar}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(tier);
                    }}
                    aria-label={`${active ? "Remove" : "Apply"} ${
                      tier === "YELLOW" ? "yellow (2x)" : "red (4x)"
                    } star`}
                    aria-pressed={active}
                    className="flex items-center justify-center p-1 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <StarIcon filled={active} color={color} />
                  </button>
                </Tooltip>
              );
            })}
          </div>
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
                  {voter.starTier && (
                    <StarIcon
                      filled
                      color={voter.starTier === "YELLOW" ? "yellow" : "red"}
                      className="h-3 w-3"
                    />
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
