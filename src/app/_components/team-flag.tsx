import { getCountryFlagEmoji } from "~/lib/country-flag";

const SIZE_CLASSES = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-5xl",
} as const;

export function TeamFlag({
  country,
  size = "md",
}: {
  country: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span
      className={SIZE_CLASSES[size]}
      role="img"
      aria-label={`${country} flag`}
    >
      {getCountryFlagEmoji(country)}
    </span>
  );
}
