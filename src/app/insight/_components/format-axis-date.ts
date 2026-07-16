export function formatAxisDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  if (!month || !day) return dateStr;
  const date = new Date(`${dateStr}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
