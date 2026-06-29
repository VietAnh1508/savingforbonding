"use client";

import { TeamFlag } from "~/app/_components/match/team-flag";
import { outcomeLabel } from "~/lib/match";
import { type VoteOutcome } from "../../../../generated/prisma";

const OUTCOMES: VoteOutcome[] = ["HOME_WIN", "DRAW", "AWAY_WIN"];

export function OutcomePicker({
  homeCountry,
  awayCountry,
  selectedOutcome,
  onSelect,
  disabled = false,
  size = "default",
  showFlags = false,
}: {
  homeCountry: string;
  awayCountry: string;
  selectedOutcome: VoteOutcome | null | undefined;
  onSelect: (outcome: VoteOutcome) => void;
  disabled?: boolean;
  size?: "compact" | "default";
  showFlags?: boolean;
}) {
  const isCompact = size === "compact";

  return (
    <div
      className={`grid grid-cols-3 ${isCompact ? "gap-2" : "gap-3"} ${disabled ? "opacity-40" : ""}`}
    >
      {OUTCOMES.map((outcome) => {
        const label = outcomeLabel(outcome, homeCountry, awayCountry);
        const selected = selectedOutcome === outcome;
        const flag = showFlags && outcome !== "DRAW" ? (outcome === "HOME_WIN" ? homeCountry : awayCountry) : null;

        return (
          <button
            key={outcome}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(outcome)}
            aria-label={`Vote: ${label}`}
            className={`flex items-center justify-center gap-1.5 border text-center font-medium transition disabled:cursor-not-allowed ${
              isCompact
                ? "rounded-lg px-2 py-2 text-sm"
                : "cursor-pointer rounded-xl p-4"
            } ${
              selected
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : `border-foreground/10 bg-foreground/5 ${isCompact ? "hover:border-emerald-500/40" : "hover:border-emerald-500/50"} hover:bg-foreground/10`
            }`}
          >
            {flag && <TeamFlag country={flag} size="sm" />}
            <span className={isCompact ? "truncate" : "font-semibold"}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
