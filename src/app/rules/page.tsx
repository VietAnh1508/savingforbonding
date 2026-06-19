import { Nav } from "~/app/_components/nav";
import { BeerStakes } from "~/app/_components/beer-stakes";

export default function RulesPage() {
  return (
    <>
      <Nav />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Betting Rules</h1>
        <p className="mb-8 text-foreground/60">
          How the beer betting system works.
        </p>
        <BeerStakes />

        <div className="mt-8 rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-sm text-foreground/70">
          <h3 className="mb-2 font-semibold text-foreground/90">Leaderboard Tiebreakers</h3>
          <p className="mb-3">
            When two players have the same number of beers, ranking is decided by:
          </p>
          <ol className="list-inside list-decimal space-y-1">
            <li>More <span className="text-red-600 dark:text-red-300">wrong predictions</span> comes first</li>
            <li>More <span className="text-foreground/50">missed predictions</span> comes first</li>
            <li>Alphabetical name order</li>
          </ol>
        </div>
      </main>
    </>
  );
}
