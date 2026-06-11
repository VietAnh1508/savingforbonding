function formatRatioValue(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

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

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
      <h3 className="mb-3 text-sm font-medium text-white/60">
        Beer Odds Ratio
      </h3>
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm font-medium">{homeCountry}</span>
        <span className="font-mono text-3xl font-bold text-emerald-400">
          {ratioDisplay}
        </span>
        <span className="text-sm font-medium">{awayCountry}</span>
      </div>
    </div>
  );
}
