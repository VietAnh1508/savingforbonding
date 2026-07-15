import { BeerStakes } from "~/app/_components/beer-stakes";
import { StarIcon } from "~/app/_components/icons/star-icon";
import { Nav } from "~/app/_components/nav";
import { formatBeers } from "~/lib/match";
import { api } from "~/trpc/server";

export default async function RulesPage() {
  const knockoutStages = await api.stage.listKnockout();
  const redStarStartStage = knockoutStages.find((s) => s.redStarEligible);
  return (
    <>
      <Nav />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Prediction Rules</h1>
        <p className="mb-8 text-foreground/60">
          How the beer prediction system works.
        </p>
        <BeerStakes />

        <div className="mt-8 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-foreground/70">
          <h3 className="mb-2 flex items-center gap-1.5 font-semibold text-violet-700 dark:text-violet-300">
            <span className="text-amber-500 dark:text-amber-400">
              <StarIcon filled />
            </span>
            Star of Hope
          </h3>
          <p className="mb-3">
            In knockout rounds, you can place a{" "}
            <strong className="text-foreground/90">Star of Hope</strong> on any
            match you&apos;ve voted on — but stars are scarce and the stakes are
            multiplied:
          </p>
          <ul className="mb-3 list-inside list-disc space-y-1">
            <li>
              <span className="text-amber-600 dark:text-amber-300">
                Yellow star
              </span>{" "}
              — doubles the stakes (2x): clears double the stage wrong penalty
              on a correct vote (floored at 0), or costs double on a wrong vote
            </li>
            <li>
              <span className="text-red-600 dark:text-red-300">Red star</span> —
              quadruples the stakes (4x) instead of doubling them.{" "}
              {redStarStartStage
                ? `Only available from the ${redStarStartStage.name} onward, since it's a bold (and expensive) bet on the board`
                : "Not currently available"}
            </li>
            <li>
              <span className="text-purple-600 dark:text-purple-300">
                Purple star
              </span>{" "}
              — octuples the stakes (8x), the boldest bet on the board. Same
              eligibility as the red star.
            </li>
          </ul>
          <p className="mb-2">
            Stars can only be placed or removed before the voting window closes
            (5 minutes before kickoff). Each stage has a fixed star budget,
            shared between yellow and red:
          </p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-foreground/50">
                <th className="pb-1 font-normal">Stage</th>
                <th className="pb-1 font-normal text-amber-500 dark:text-amber-400">
                  Stars
                </th>
                <th className="pb-1 font-normal text-amber-600 dark:text-amber-300">
                  Yellow (2x)
                </th>
                <th className="pb-1 font-normal text-red-600 dark:text-red-400">
                  Red (4x)
                </th>
                <th className="pb-1 font-normal text-purple-600 dark:text-purple-400">
                  Purple (8x)
                </th>
              </tr>
            </thead>
            <tbody>
              {knockoutStages.map((stage) => (
                <tr
                  key={stage.name}
                  className="border-b border-foreground/5 last:border-0"
                >
                  <td className="py-0.5">{stage.name}</td>
                  <td className="py-0.5 text-amber-500 dark:text-amber-400">
                    {stage.starsAllocated}
                  </td>
                  <td className="py-0.5 text-amber-600 dark:text-amber-300">
                    {formatBeers(stage.wrongPenalty * 2)}
                  </td>
                  <td className="py-0.5 text-red-600 dark:text-red-300">
                    {stage.redStarEligible
                      ? formatBeers(stage.wrongPenalty * 4)
                      : "—"}
                  </td>
                  <td className="py-0.5 text-purple-600 dark:text-purple-300">
                    {stage.redStarEligible
                      ? formatBeers(stage.wrongPenalty * 8)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-xl border border-foreground/10 bg-foreground/5 p-4 text-sm text-foreground/70">
          <h3 className="mb-2 font-semibold text-foreground/90">
            Leaderboard Tiebreakers
          </h3>
          <p className="mb-3">
            Tied players share the same rank. If a further tiebreaker is needed:
          </p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              Lower{" "}
              <span className="text-amber-600 dark:text-amber-400">
                accuracy
              </span>{" "}
              (correct ÷ voted) ranks lower
            </li>
            <li>
              Most{" "}
              <span className="text-red-600 dark:text-red-300">
                wrong predictions
              </span>{" "}
              ranks lower
            </li>
            <li>
              Most{" "}
              <span className="text-foreground/50">missed predictions</span>{" "}
              ranks lower
            </li>
            <li>Players still tied share the same rank</li>
          </ol>
        </div>
      </main>
    </>
  );
}
