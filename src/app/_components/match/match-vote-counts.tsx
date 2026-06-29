import { type MatchVoteCounts, voterLabel } from "~/lib/match";

export function MatchVoteCounts({
  homeCountry,
  awayCountry,
  voteCounts,
}: {
  homeCountry: string;
  awayCountry: string;
  voteCounts: MatchVoteCounts;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-center text-xs text-foreground/50">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
        <span className="font-medium text-foreground/70">{homeCountry}</span>
        <span>{voterLabel(voteCounts.home)}</span>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className="font-medium text-foreground/60">Draw</span>
        <span>{voterLabel(voteCounts.draw)}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
        <span className="font-medium text-foreground/70">{awayCountry}</span>
        <span>{voterLabel(voteCounts.away)}</span>
      </div>
    </div>
  );
}
