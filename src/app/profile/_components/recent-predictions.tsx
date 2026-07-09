import { StarIcon } from "~/app/_components/icons/star-icon";
import { MatchScore } from "~/app/_components/match/match-score";
import {
  deriveEffectiveResult,
  deriveResult,
  formatRatioValue,
  hasVotingHandicap,
  outcomeLabel,
} from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type VoteItem = {
  kind: "vote";
  id: string;
  kickoffAt: Date;
  homeCountry: string;
  awayCountry: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  homeRatio: number;
  awayRatio: number;
  outcome: RouterOutputs["vote"]["getMyVotes"][number]["outcome"];
  isCorrect: boolean | null;
  points: number;
  hasStar: boolean;
  runningTotal: number;
};

type MissedItem = {
  kind: "missed";
  id: string;
  kickoffAt: Date;
  homeCountry: string;
  awayCountry: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  homeRatio: number;
  awayRatio: number;
  points: number;
  runningTotal: number;
};

type LedgerItem = VoteItem | MissedItem;

function MatchLabel({ item }: { item: LedgerItem }) {
  return (
    <>
      <span>
        {item.homeCountry}{" "}
        <MatchScore
          homeScore={item.homeScore}
          awayScore={item.awayScore}
          homePenaltyScore={item.homePenaltyScore}
          awayPenaltyScore={item.awayPenaltyScore}
          className=""
          penaltyClassName="text-foreground/40"
        />{" "}
        {item.awayCountry}
      </span>
      {hasVotingHandicap(item.homeRatio, item.awayRatio) && (
        <span className="block text-xs font-normal text-foreground/50">
          Handicap:{" "}
          <strong className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            {formatRatioValue(item.homeRatio)}/
            {formatRatioValue(item.awayRatio)}
          </strong>
        </span>
      )}
    </>
  );
}

function rawResultLabel(item: LedgerItem): string | null {
  if (item.homeScore === null || item.awayScore === null) return null;
  return outcomeLabel(
    deriveResult(item.homeScore, item.awayScore),
    item.homeCountry,
    item.awayCountry,
  );
}

function effectiveResultLabel(item: LedgerItem): string | null {
  if (item.homeScore === null || item.awayScore === null) return null;
  return outcomeLabel(
    deriveEffectiveResult(
      item.homeScore,
      item.awayScore,
      item.homeRatio,
      item.awayRatio,
    ),
    item.homeCountry,
    item.awayCountry,
  );
}

function ResultCell({ item }: { item: LedgerItem }) {
  const raw = rawResultLabel(item);
  const effective = effectiveResultLabel(item);
  if (raw === null || effective === null) return "—";
  if (raw === effective) return raw;
  return (
    <>
      <span>
        {raw} <span className="text-foreground/40">(raw)</span>
      </span>
      <span className="block text-xs text-foreground/50">
        Handicap-adjusted:{" "}
        <strong className="font-semibold text-foreground/80">
          {effective}
        </strong>
      </span>
    </>
  );
}

export function RecentPredictions({ items }: { items: LedgerItem[] }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-2 text-xl font-semibold">Match History</h2>
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
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-foreground/10">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="sticky top-0 bg-card text-xs uppercase tracking-wide text-foreground/50">
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Match</th>
                <th className="px-3 py-2 text-left font-medium">Pick</th>
                <th className="px-3 py-2 text-left font-medium">Result</th>
                <th className="px-3 py-2 text-center font-medium">Star</th>
                <th className="px-3 py-2 text-left font-medium">Outcome</th>
                <th className="px-3 py-2 text-right font-medium">Beer</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={`${item.kind}-${item.id}`}
                  className="border-t border-foreground/10 even:bg-foreground/[0.03]"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-foreground/50">
                    {item.kickoffAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    <MatchLabel item={item} />
                  </td>
                  <td className="px-3 py-2">
                    {item.kind === "vote" ? (
                      outcomeLabel(
                        item.outcome,
                        item.homeCountry,
                        item.awayCountry,
                      )
                    ) : (
                      <span className="text-foreground/40 italic">No vote</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-foreground/70">
                    <ResultCell item={item} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {item.kind === "vote" && item.hasStar ? (
                      <span className="inline-flex items-center text-amber-500 dark:text-amber-400">
                        <StarIcon filled />
                      </span>
                    ) : (
                      <span className="text-foreground/20">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {item.kind === "missed" ? (
                      <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs text-yellow-700 dark:text-yellow-300">
                        No vote
                      </span>
                    ) : item.isCorrect === null ? (
                      <span className="text-xs text-foreground/40">
                        Pending
                      </span>
                    ) : item.isCorrect ? (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                        Correct
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-700 dark:text-red-300">
                        Wrong
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {item.kind === "vote" && item.isCorrect === null ? (
                      <span className="text-foreground/30">—</span>
                    ) : (
                      <span
                        className={
                          item.points > 0
                            ? "text-red-700 dark:text-red-300"
                            : item.points < 0
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-foreground/50"
                        }
                      >
                        {item.points > 0 ? `+${item.points}` : item.points}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {item.runningTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
