"use client";

import { type ReactNode } from "react";
import { type ScatterShapeProps } from "recharts";

import { UserAvatar } from "~/app/_components/user-avatar";

export const CURRENT_USER_COLOR = "#10b981"; // emerald-500
export const OTHER_COLOR = "#94a3b8"; // slate-400

/** Scatter dot shared by insight charts: bigger + emerald for the current user, an invisible hit area for easier hover/tap. */
export function ScatterUserDot({
  cx,
  cy,
  payload,
  currentUserId,
  radius = 5,
}: ScatterShapeProps & {
  payload?: { id: string };
  currentUserId?: string;
  radius?: number;
}) {
  if (cx === undefined || cy === undefined || !payload) return null;

  const isCurrentUser = payload.id === currentUserId;
  const color = isCurrentUser ? CURRENT_USER_COLOR : OTHER_COLOR;
  const r = isCurrentUser ? radius + 2 : radius;

  return (
    <g className="cursor-pointer">
      {/* Generous invisible hit area, bigger than the painted dot */}
      <circle cx={cx} cy={cy} r={r + 8} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.75}
        strokeWidth={2}
        className="stroke-white dark:stroke-neutral-900"
      />
    </g>
  );
}

/** Tooltip card shell shared by insight scatter charts: avatar + name header, caller-supplied stat lines. */
export function ChartTooltipCard({
  name,
  image,
  isCurrentUser,
  children,
}: {
  name: string | null;
  image: string | null;
  isCurrentUser: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-white px-3 py-2 text-sm shadow-lg dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <UserAvatar
          name={name}
          image={image}
          size={24}
          fallbackClassName="bg-emerald-500/20 text-xs"
        />
        <span className="font-semibold text-foreground">
          {name ?? "Anonymous"}
          {isCurrentUser ? " (you)" : ""}
        </span>
      </div>
      {children}
    </div>
  );
}
