export function InfoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a1 1 0 011-1h.01a1 1 0 01.99 1v4a1 1 0 01-2 0V9zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
