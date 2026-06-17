type MatchStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "POSTPONED" | "CANCELLED";

const STYLES: Record<MatchStatus, string> = {
  SCHEDULED: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  LIVE: "bg-red-500/20 text-red-700 dark:text-red-300 animate-pulse",
  COMPLETED: "bg-gray-500/20 text-gray-600 dark:text-gray-300",
  POSTPONED: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  CANCELLED: "bg-gray-500/20 text-gray-500 dark:text-gray-400",
};

const LABELS: Record<MatchStatus, string> = {
  SCHEDULED: "UP COMING",
  LIVE: "LIVE",
  COMPLETED: "COMPLETED",
  POSTPONED: "POSTPONED",
  CANCELLED: "CANCELLED",
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
