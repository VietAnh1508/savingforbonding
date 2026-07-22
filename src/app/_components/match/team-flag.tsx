import Image from "next/image";

import { getFifaFlagUrl, getFlagUrlForCode } from "~/lib/country-flag";

const SIZE_CLASSES = {
  sm: "h-6 aspect-[3/2]",
  md: "h-9 aspect-[3/2]",
  lg: "h-12 aspect-[3/2]",
} as const;

// h-6=24px, h-9=36px, h-12=48px — 3:2 ratio
const SIZE_DIMENSIONS = {
  sm: { width: 36, height: 24 },
  md: { width: 54, height: 36 },
  lg: { width: 72, height: 48 },
} as const;

export function TeamFlag({
  country,
  code,
  imageUrl,
  size = "md",
}: {
  country: string;
  /** FIFA team/association code, when already known — skips the name lookup entirely. */
  code?: string | null;
  /** Pre-resolved image URL (e.g. a source-specific team crest) — takes priority over `code`/`country` lookup. */
  imageUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const url = imageUrl ?? (code ? getFlagUrlForCode(code) : getFifaFlagUrl(country));

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
    <Image
      src={url}
      alt={`${country} flag`}
      {...SIZE_DIMENSIONS[size]}
      className={`${SIZE_CLASSES[size]} rounded-sm object-cover`}
    />
  );
}
