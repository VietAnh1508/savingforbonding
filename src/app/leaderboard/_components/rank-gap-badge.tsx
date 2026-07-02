export function RankGapBadge({ gap }: { gap: number | undefined }) {
  if (!gap) return null;

  const isUp = gap > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
        isUp
          ? "text-red-600 dark:text-red-400"
          : "text-emerald-600 dark:text-emerald-400"
      }`}
    >
      {isUp ? "▲" : "▼"}
      {Math.abs(gap)}
    </span>
  );
}
