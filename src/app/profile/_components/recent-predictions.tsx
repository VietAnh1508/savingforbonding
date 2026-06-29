import { StarIcon } from "~/app/_components/icons/star-icon";
import { BEER_NO_BET, formatBeers, outcomeLabel } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type VoteItem =
  | {
      kind: "vote";
      id: string;
      kickoffAt: Date;
      homeCountry: string;
      awayCountry: string;
      outcome: RouterOutputs["vote"]["getMyVotes"][number]["outcome"];
      isCorrect: boolean | null;
      points: number;
      hasStar: boolean;
    }
  | {
      kind: "missed";
      id: string;
      kickoffAt: Date;
      homeCountry: string;
      awayCountry: string;
    };

export function RecentPredictions({ items }: { items: VoteItem[] }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-4 text-xl font-semibold">Match History</h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-8 text-center text-foreground/50">
          No predictions yet.{" "}
          <a
            href="/"
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Browse matches
          </a>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <a
              key={`${item.kind}-${item.id}`}
              href={`/matches/${item.id}`}
              className="flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/5 p-4 transition hover:bg-foreground/10"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {item.homeCountry} vs {item.awayCountry}
                  <span className="ml-2 text-sm font-normal text-foreground/50">
                    {item.kickoffAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="text-sm text-foreground/50">
                  {item.kind === "vote"
                    ? `Predicted: ${outcomeLabel(item.outcome, item.homeCountry, item.awayCountry)}`
                    : "No prediction"}
                </div>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-1.5">
                {item.kind === "vote" && item.hasStar && (
                  <span className="text-amber-500 dark:text-amber-400">
                    <StarIcon filled />
                  </span>
                )}
                {item.kind === "missed" ? (
                  <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-700 dark:text-yellow-300">
                    🍺 {formatBeers(BEER_NO_BET)}
                  </span>
                ) : item.isCorrect === null ? (
                  <span className="text-sm text-foreground/40">Pending</span>
                ) : (
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      item.isCorrect
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "bg-red-500/20 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {item.isCorrect && item.points < 0
                      ? `🍺 cleared ${formatBeers(-item.points)}`
                      : `🍺 ${formatBeers(item.points)}`}
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
