export function formatAccuracy(correct: number, incorrect: number): string {
  const total = correct + incorrect;
  return total > 0 ? ((correct / total) * 100).toFixed(2) : "0.00";
}

export const RANK_BADGE_CLASSES: Record<number, string> = {
  1: "bg-yellow-400/20 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300",
  2: "bg-slate-400/20 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
  3: "bg-amber-600/20 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};
