"use client";

import { useState, type PropsWithChildren } from "react";

type TooltipProps = PropsWithChildren<{ label: string }>;

export function Tooltip({ label, children }: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      className="inline-flex"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: rect.left + rect.width / 2, y: rect.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <span
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y - 6,
            transform: "translate(-50%, -100%)",
          }}
          className="pointer-events-none z-50 whitespace-nowrap rounded-md bg-zinc-800 px-2 py-1 text-xs text-white"
        >
          {label}
        </span>
      )}
    </div>
  );
}
