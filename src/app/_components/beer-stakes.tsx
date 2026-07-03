import { BEER_WIN, formatBeers } from "~/lib/match";
import { api } from "~/trpc/server";

export async function BeerStakes() {
  const stages = await api.stage.list();

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground/70">
      <h3 className="mb-2 font-semibold text-amber-700 dark:text-amber-300">🍺 Beer stakes</h3>
      <p className="mb-3">
        Every match requires a prediction. Miss it and you still owe beer. Win or lose
        is decided after the match handicap — not just the raw score.
      </p>
      <p className="mb-2">
        <span className="text-emerald-600 dark:text-emerald-300">Correct</span> — always {formatBeers(BEER_WIN)}.
        Wrong and no-pick penalties escalate each knockout round:
      </p>
      <table className="w-full">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-foreground/50">
            <th className="pb-1 font-normal">Stage</th>
            <th className="pb-1 font-normal text-red-600 dark:text-red-400">Wrong</th>
            <th className="pb-1 font-normal text-foreground/50">No pick</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.id} className="border-b border-foreground/5 last:border-0">
              <td className="py-0.5">{s.name}</td>
              <td className="py-0.5 text-red-600 dark:text-red-300">{formatBeers(s.wrongPenalty)}</td>
              <td className="py-0.5 text-foreground/50">{formatBeers(s.noVotePenalty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
