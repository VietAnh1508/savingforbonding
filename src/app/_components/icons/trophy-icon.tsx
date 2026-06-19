export function TrophyIcon({ size = 24, className }: { size?: number; className?: string }) {
  // Wide ball top → dramatic pinched waist → flared cup → wide base
  const body =
    "M50 4 C90 4 90 82 64 82 C66 88 58 96 54 106 C52 116 62 130 68 144 L72 154 L28 154 L32 144 C38 130 48 116 46 106 C42 96 34 88 36 82 C10 82 10 4 50 4Z";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 100 160"
      className={className}
    >
      <defs>
        <clipPath id="wc-trophy-body">
          <path d={body} />
        </clipPath>
      </defs>

      {/* Main gold fill */}
      <path d={body} fill="#E5A825" />

      <g clipPath="url(#wc-trophy-body)">
        {/* Right-side depth shading across whole trophy */}
        <rect x="54" y="0" width="50" height="160" fill="#C07010" opacity="0.15" />

        {/* Soccer ball hexagonal pattern — dark cells, lighter gaps read as lines */}
        <g fill="#C07010" opacity="0.45">
          {/* Central pentagon */}
          <polygon points="50,29 63,39 58,54 42,54 37,39" />
          {/* Top hex */}
          <polygon points="50,7 60,13 60,25 50,31 40,25 40,13" />
          {/* Top-right hex */}
          <polygon points="73,24 83,30 83,42 73,48 63,42 63,30" />
          {/* Bottom-right hex */}
          <polygon points="64,50 74,56 74,68 64,74 54,68 54,56" />
          {/* Bottom-left hex */}
          <polygon points="36,50 46,56 46,68 36,74 26,68 26,56" />
          {/* Top-left hex */}
          <polygon points="27,24 37,30 37,42 27,48 17,42 17,30" />
        </g>

        {/* Darker tint on neck + cup section */}
        <rect x="0" y="82" width="100" height="72" fill="#B07010" opacity="0.25" />

        {/* Green stripes */}
        <rect x="0" y="106" width="100" height="7" fill="#2E7D32" />
        <rect x="0" y="116" width="100" height="7" fill="#43A047" />
        <rect x="0" y="126" width="100" height="7" fill="#2E7D32" />
      </g>

      {/* Base platform */}
      <rect x="14" y="154" width="72" height="6" rx="2" fill="#B07010" />
    </svg>
  );
}
