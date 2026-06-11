import { BEER_LOSE, BEER_NO_BET, BEER_WIN, formatBeers } from "~/lib/match";

export function BeerStakes() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-white/70">
      <h3 className="mb-2 font-semibold text-amber-300">🍺 Beer stakes</h3>
      <p className="mb-2">Every match requires a bet. Miss it and you still owe beer.</p>
      <ul className="space-y-1">
        <li>
          <span className="text-emerald-300">Win</span> — {formatBeers(BEER_WIN)}
        </li>
        <li>
          <span className="text-red-300">Lose</span> — {formatBeers(BEER_LOSE)}{" "}
          <span className="text-white/40">(1 platform fee + 2 penalty)</span>
        </li>
        <li>
          <span className="text-white/50">No bet</span> — {formatBeers(BEER_NO_BET)}
        </li>
      </ul>
    </div>
  );
}
