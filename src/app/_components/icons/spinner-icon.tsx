export function SpinnerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="currentColor">
      {/* Ball */}
      <circle cx="12" cy="12" r="10" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.2" />
      {/* Center pentagon */}
      <polygon points="12,9.5 14.38,11.23 13.47,14.02 10.53,14.02 9.62,11.23" />
      {/* 5 outer patches at r=7 from center, rotated 36° from pentagon vertices */}
      <circle cx="16.12" cy="6.34" r="2" />
      <circle cx="18.66" cy="14.16" r="2" />
      <circle cx="12" cy="19" r="2" />
      <circle cx="5.34" cy="14.16" r="2" />
      <circle cx="7.88" cy="6.34" r="2" />
    </svg>
  );
}
