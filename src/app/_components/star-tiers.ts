import type { StarIconColor } from "~/app/_components/icons/star-icon";
import { STAR_TIER_MULTIPLIERS } from "~/lib/match";

/** Display name + color per star tier — single source shared by the picker, admin panel, and rules page. */
export const STAR_TIER_INFO: Record<
  (typeof STAR_TIER_MULTIPLIERS)[number],
  { name: string; color: StarIconColor }
> = {
  2: { name: "Yellow", color: "yellow" },
  4: { name: "Red", color: "red" },
  8: { name: "Purple", color: "purple" },
  16: { name: "Black", color: "black" },
};

const STAR_TIER_TEXT_CLASSES: Record<StarIconColor, string> = {
  yellow: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
  purple: "text-purple-600 dark:text-purple-400",
  black: "text-neutral-900 dark:text-neutral-100",
  inherit: "",
};

export function starTierColor(multiplier: number): StarIconColor {
  return STAR_TIER_INFO[multiplier as keyof typeof STAR_TIER_INFO]?.color ?? "yellow";
}

export function starTierTextClass(multiplier: number): string {
  return STAR_TIER_TEXT_CLASSES[starTierColor(multiplier)];
}
