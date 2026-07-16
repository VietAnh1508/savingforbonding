"use client";

import { StarIcon } from "~/app/_components/icons/star-icon";
import { STAR_TIER_INFO, starTierColor, starTierTextClass } from "~/app/_components/star-tiers";
import { Tooltip } from "~/app/_components/tooltip";
import { STAR_TIER_MULTIPLIERS } from "~/lib/match";

// Row of colored star tiers, filtered to the ones this stage allows (e.g.
// maxMultiplier=8 -> Yellow/Red/Purple). Only the currently-selected tier's
// star is lit — clicking it removes the vote, clicking any other star sets
// that tier directly. One click, no popover.
export function StarPicker({
  multiplier,
  maxMultiplier,
  disabled = false,
  onSelect,
  starClassName = "h-4 w-4",
}: {
  multiplier: number | null;
  maxMultiplier: number;
  disabled?: boolean;
  onSelect: (multiplier: number | null) => void;
  starClassName?: string;
}) {
  const values = STAR_TIER_MULTIPLIERS.filter((v) => v <= maxMultiplier);

  return (
    <div className="flex items-center gap-1.5">
      {values.map((value) => {
        const active = value === multiplier;
        const tier = STAR_TIER_INFO[value];
        return (
          <Tooltip
            key={value}
            label={`${active ? "Remove" : "Apply"} ${tier.name} ×${value}`}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(active ? null : value);
              }}
              aria-label={`${active ? "Remove" : "Apply"} ${tier.name} ×${value} star`}
              aria-pressed={active}
              className="flex items-center justify-center p-1 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <StarIcon filled={active} color={tier.color} sizeClassName={starClassName} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Read-only star + multiplier display for historical/voter-list views. */
export function StarBadge({
  multiplier,
  className = "",
}: {
  multiplier: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <StarIcon filled color={starTierColor(multiplier)} />
      <span className={`text-xs font-medium ${starTierTextClass(multiplier)}`}>
        ×{multiplier}
      </span>
    </span>
  );
}
