import { type MatchVoter } from "~/lib/match";
import { StarIcon } from "~/app/_components/icons/star-icon";

function VoterColumn({ voters, grow }: { voters: MatchVoter[]; grow?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 ${grow ? "min-w-0 flex-1" : ""}`}>
      {voters.length === 0 ? (
        <span className="text-xs text-foreground/30">—</span>
      ) : (
        voters.map((v) => (
          <span key={v.id} className="flex items-center gap-0.5 text-xs text-foreground/60">
            {v.hasStar && <StarIcon filled className="h-3 w-3" />}
            {v.name}
          </span>
        ))
      )}
    </div>
  );
}

export function VoterList({
  voters,
}: {
  voters: {
    home: MatchVoter[];
    draw: MatchVoter[];
    away: MatchVoter[];
  };
}) {
  const total = voters.home.length + voters.draw.length + voters.away.length;
  if (total === 0) return null;

  return (
    <>
      <div className="my-3 border-t border-foreground/10" />
      <p className="mb-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">Voters</p>
      <div className="flex items-start gap-4 text-center">
        <VoterColumn voters={voters.home} grow />
        <VoterColumn voters={voters.draw} />
        <VoterColumn voters={voters.away} grow />
      </div>
    </>
  );
}
