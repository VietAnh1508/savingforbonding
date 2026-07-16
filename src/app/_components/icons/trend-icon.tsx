export function TrendIcon({
  direction,
  className = "h-4 w-4",
}: {
  direction: "up" | "down";
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${direction === "down" ? "-scale-y-100" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l6-6 4 4 6-8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 6h6v6" />
    </svg>
  );
}
