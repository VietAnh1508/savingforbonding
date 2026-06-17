import {
  describeHandicapRule,
  formatRatioValue,
  hasBettingHandicap,
} from "~/lib/match";

export function BettingRatios({
  homeCountry,
  awayCountry,
  homeRatio,
  awayRatio,
}: {
  homeCountry: string;
  awayCountry: string;
  homeRatio: number;
  awayRatio: number;
}) {
  const ratioDisplay = `${formatRatioValue(homeRatio)}/${formatRatioValue(awayRatio)}`;
  const handicapRule = describeHandicapRule(
    homeCountry,
    awayCountry,
    homeRatio,
    awayRatio,
  );

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6 text-center">
      <h3 className="mb-3 text-sm font-medium text-foreground/60">
        Beer Odds Ratio
      </h3>
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm font-medium">{homeCountry}</span>
        <span className="font-mono text-3xl font-bold text-emerald-600 dark:text-emerald-400">
          {ratioDisplay}
        </span>
        <span className="text-sm font-medium">{awayCountry}</span>
      </div>
      {handicapRule ? (
        <p className="mt-4 text-sm text-foreground/50">{handicapRule}</p>
      ) : (
        <p className="mt-4 text-sm text-foreground/40">
          No handicap set — result uses the raw scoreline.
        </p>
      )}
      {hasBettingHandicap(homeRatio, awayRatio) && (
        <p className="mt-2 text-xs text-foreground/30">
          Decimal lines (e.g. 1.5, 2.25) are applied to adjusted scores.
        </p>
      )}
    </div>
  );
}
