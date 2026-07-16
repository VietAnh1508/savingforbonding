/** Single die face (5 pips) — represents going "all in" on a bet. */
export function AllInIcon({
  className = "h-4 w-4 text-red-600 dark:text-red-400",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden="true"
    >
      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="3.5" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
