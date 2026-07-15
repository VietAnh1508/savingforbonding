"use client";

import { StarIcon } from "~/app/_components/icons/star-icon";
import { Tooltip } from "~/app/_components/tooltip";
import { VoteStarTier } from "../../../generated/prisma";

// Shared star tier for both the champion pick and the match vote star pickers.
export type StarTier = VoteStarTier;

export const STAR_TIERS: readonly StarTier[] = Object.values(VoteStarTier);

// Champion vote only ever offers yellow/red — purple is match-vote only.
export const CHAMPION_STAR_TIERS: readonly StarTier[] = STAR_TIERS.filter(
  (tier) => tier !== "PURPLE",
);

const TIER_COPY: Record<
  StarTier,
  { tooltip: string; aria: string; color: "yellow" | "red" | "purple" }
> = {
  YELLOW: { tooltip: "yellow star (2x)", aria: "yellow (2x)", color: "yellow" },
  RED: { tooltip: "red star (4x)", aria: "red (4x)", color: "red" },
  PURPLE: { tooltip: "purple star (8x)", aria: "purple (8x)", color: "purple" },
};

export function StarTierButtons({
  tiers = STAR_TIERS,
  activeTier,
  isTierDisabled,
  onToggle,
  gapClassName = "gap-1.5",
}: {
  tiers?: readonly StarTier[];
  activeTier: StarTier | null;
  isTierDisabled?: (tier: StarTier) => boolean;
  onToggle: (tier: StarTier) => void;
  gapClassName?: string;
}) {
  return (
    <div className={`flex items-center ${gapClassName}`}>
      {tiers.map((tier) => {
        const active = activeTier === tier;
        const disabled = isTierDisabled?.(tier) ?? false;
        const copy = TIER_COPY[tier];
        return (
          <Tooltip
            key={tier}
            label={`${active ? "Remove" : "Apply"} ${copy.tooltip}`}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(tier);
              }}
              aria-label={`${active ? "Remove" : "Apply"} ${copy.aria} star`}
              aria-pressed={active}
              className="flex items-center justify-center p-1 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <StarIcon filled={active} color={copy.color} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
