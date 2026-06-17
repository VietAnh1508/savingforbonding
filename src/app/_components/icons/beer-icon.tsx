export function BeerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 11h1a3 3 0 010 6h-1" />
      <path d="M9 12v6" />
      <path d="M13 12v6" />
      <path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.44.5-3 .5" />
      <path d="M3 8l.6 10.6A2 2 0 005.6 21h8.8a2 2 0 002-1.9L17 8H3z" />
      <path d="M5 8V6a2 2 0 012-2h8a2 2 0 012 2v2" />
    </svg>
  );
}
