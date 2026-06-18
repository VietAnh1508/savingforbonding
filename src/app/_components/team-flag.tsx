import { getFifaFlagUrl } from "~/lib/country-flag";

const SIZE_CLASSES = {
  sm: "h-6 aspect-[3/2]",
  md: "h-9 aspect-[3/2]",
  lg: "h-12 aspect-[3/2]",
} as const;

export function TeamFlag({
  country,
  size = "md",
}: {
  country: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const url = getFifaFlagUrl(country);

  if (!url) {
    return (
      <span
        className={SIZE_CLASSES[size]}
        role="img"
        aria-label={`${country} flag`}
      >
        🏳️
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${country} flag`}
      className={`${SIZE_CLASSES[size]} rounded-sm object-cover`}
    />
  );
}
