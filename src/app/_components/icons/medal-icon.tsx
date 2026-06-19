const COLORS = {
  gold: {
    ribbon: "#C8960C",
    ribbonShine: "#F0C040",
    face: "#E5A825",
    faceShine: "#F8D878",
    faceShadow: "#B07010",
    ring: "#F0C040",
  },
  silver: {
    ribbon: "#888090",
    ribbonShine: "#B8B4C4",
    face: "#B8BECB",
    faceShine: "#DEE6F2",
    faceShadow: "#7A8290",
    ring: "#C4CAD4",
  },
  bronze: {
    ribbon: "#8B5000",
    ribbonShine: "#CC7C28",
    face: "#C07830",
    faceShine: "#E8A850",
    faceShadow: "#7A4000",
    ring: "#D09040",
  },
} as const;

export function MedalIcon({
  size = 24,
  variant,
  className,
}: {
  size?: number;
  variant: "gold" | "silver" | "bronze";
  className?: string;
}) {
  const c = COLORS[variant];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 148"
      className={className}
    >
      {/* Ribbon — left strip with shine */}
      <path d="M28 10 L44 10 L50 48 L34 48Z" fill={c.ribbon} />
      <path d="M32 10 L44 10 L50 48 L38 48Z" fill={c.ribbonShine} opacity="0.55" />

      {/* Ribbon — right strip with shine */}
      <path d="M56 10 L72 10 L66 48 L50 48Z" fill={c.ribbon} />
      <path d="M56 10 L68 10 L62 48 L50 48Z" fill={c.ribbonShine} opacity="0.55" />

      {/* Ring connector */}
      <ellipse cx="50" cy="50" rx="12" ry="8" fill={c.faceShadow} />
      <ellipse cx="50" cy="48" rx="12" ry="8" fill={c.face} />

      {/* Medal shadow for depth */}
      <circle cx="50" cy="102" r="42" fill={c.faceShadow} />
      {/* Medal face */}
      <circle cx="50" cy="100" r="42" fill={c.face} />
      {/* Shine highlight */}
      <circle cx="36" cy="80" r="26" fill={c.faceShine} opacity="0.4" />
      {/* Inner decorative ring */}
      <circle cx="50" cy="100" r="30" fill="none" stroke={c.ring} strokeWidth="3" opacity="0.8" />
    </svg>
  );
}
