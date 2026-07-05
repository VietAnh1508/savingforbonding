import { type MatchStatus } from "../../../../generated/prisma";

export function MatchScore({
  homeScore,
  awayScore,
  homePenaltyScore,
  awayPenaltyScore,
  status,
  className = "text-xl font-bold",
  penaltyClassName = "text-sm font-normal text-foreground/40",
}: {
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  status?: MatchStatus;
  className?: string;
  penaltyClassName?: string;
}) {
  const isTbd =
    homeScore === null ||
    awayScore === null ||
    (status !== undefined && status !== "LIVE" && status !== "COMPLETED");

  if (isTbd) {
    return <span className={`${className} text-foreground/40`}>vs</span>;
  }

  const hasPenalties = homePenaltyScore !== null && awayPenaltyScore !== null;

  return (
    <span className={className}>
      {homeScore}
      {hasPenalties && (
        <span className={penaltyClassName}> ({homePenaltyScore})</span>
      )}
      {" - "}
      {awayScore}
      {hasPenalties && (
        <span className={penaltyClassName}> ({awayPenaltyScore})</span>
      )}
    </span>
  );
}
