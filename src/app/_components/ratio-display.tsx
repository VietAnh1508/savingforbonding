import { formatRatioValue } from "~/lib/match";

const sizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  lg: "text-3xl font-bold",
} as const;

export function RatioDisplay({
  homeRatio,
  awayRatio,
  size = "xs",
}: {
  homeRatio: number;
  awayRatio: number;
  size?: keyof typeof sizeClasses;
}) {
  return (
    <span className={`font-mono text-emerald-600 dark:text-emerald-400 ${sizeClasses[size]}`}>
      {formatRatioValue(homeRatio)}/{formatRatioValue(awayRatio)}
    </span>
  );
}
