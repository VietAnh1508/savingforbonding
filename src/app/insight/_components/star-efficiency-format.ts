export function formatSigned(n: number, digits = 0): string {
  const rounded = n.toFixed(digits);
  return n > 0 ? `+${rounded}` : rounded;
}

export function formatPct(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${(ratio * 100).toFixed(0)}%`;
}
