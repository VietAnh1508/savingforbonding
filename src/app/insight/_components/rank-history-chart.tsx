"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatAxisDate } from "~/app/insight/_components/format-axis-date";
import { api } from "~/trpc/react";

const PALETTE = [
  "#f59e0b",
  "#3b82f6",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#a16207",
  "#15803d",
];

export function RankHistoryChart({
  currentUserId,
}: {
  currentUserId?: string;
}) {
  const { data, isLoading } = api.leaderboard.rankByDay.useQuery();
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!data) return map;
    let paletteIdx = 0;
    for (const s of data.series) {
      if (s.userId === currentUserId) {
        map.set(s.userId, "#10b981");
      } else {
        map.set(s.userId, PALETTE[paletteIdx % PALETTE.length]!);
        paletteIdx++;
      }
    }
    return map;
  }, [data, currentUserId]);

  // Ranks only — beers are looked up from data.days in the tooltip to avoid
  // encoding them as prefixed keys and risking collisions with userId keys.
  const chartData = useMemo(
    () => data?.days.map(({ date, ranks }) => ({ date, ...ranks })) ?? [],
    [data],
  );

  if (isLoading) {
    return <div className="h-[480px] animate-pulse rounded-xl bg-foreground/5" />;
  }

  if (!data || data.days.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6 text-center text-sm text-foreground/40">
        No completed matches yet — check back after the first game.
      </div>
    );
  }

  const maxRank = data.series.length;
  const minWidth = Math.max(560, data.days.length * 56);

  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/10 bg-foreground/5 p-4">
      <p className="mb-2 text-xs text-foreground/40">
        Hover a line to trace a player.
      </p>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div style={{ minWidth }} onMouseLeave={() => setHoveredUserId(null)}>
        <ResponsiveContainer width="100%" height={480}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatAxisDate}
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              reversed
              allowDecimals={false}
              domain={[1, maxRank]}
              tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={
                hoveredUserId
                  ? { stroke: "currentColor", strokeOpacity: 0.15 }
                  : false
              }
              content={({ active, payload, label }) => {
                if (!active || !hoveredUserId || !payload?.length) return null;
                const row = payload[0]?.payload as Record<string, number | string>;
                const rank = row[hoveredUserId] as number | undefined;
                if (!rank) return null;

                // Look up beer count directly from the source data
                const day = data.days.find((d) => d.date === label);
                const beers = day?.beers[hoveredUserId];
                const series = data.series.find((s) => s.userId === hoveredUserId);

                // Champion/top-scorer results land as a one-time swing on the
                // Final's day — surface the breakdown only there.
                const isBonusDay = data.bonusDay?.date === label;
                const championSwing = isBonusDay
                  ? data.bonusDay?.championPoints[hoveredUserId]
                  : undefined;
                const topScorerSwing = isBonusDay
                  ? data.bonusDay?.topScorerPoints[hoveredUserId]
                  : undefined;

                return (
                  <div className="rounded-lg border border-foreground/10 bg-white px-3 py-2 text-sm shadow-lg dark:bg-neutral-900">
                    <p
                      className="font-semibold"
                      style={{ color: colorMap.get(hoveredUserId) }}
                    >
                      #{rank} {series?.name ?? "Anonymous"}
                      {hoveredUserId === currentUserId ? " (you)" : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {beers !== undefined ? `🍺 ${beers} · ` : ""}
                      {formatAxisDate(label as string)}
                    </p>
                    {(championSwing !== undefined || topScorerSwing !== undefined) && (
                      <p className="mt-1 text-xs text-foreground/50">
                        {championSwing !== undefined
                          ? `Champion ${championSwing > 0 ? "+" : ""}${championSwing}`
                          : ""}
                        {championSwing !== undefined && topScorerSwing !== undefined
                          ? " · "
                          : ""}
                        {topScorerSwing !== undefined
                          ? `Top scorer ${topScorerSwing > 0 ? "+" : ""}${topScorerSwing}`
                          : ""}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {data.series.map((s) => {
              const isHovered = hoveredUserId === s.userId;
              const opacity = hoveredUserId ? (isHovered ? 1 : 0.06) : 0.3;
              return (
                <Line
                  key={s.userId}
                  dataKey={s.userId}
                  className="cursor-pointer"
                  stroke={colorMap.get(s.userId)}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeOpacity={opacity}
                  dot={false}
                  activeDot={
                    isHovered
                      ? { r: 4, strokeWidth: 0, fill: colorMap.get(s.userId) }
                      : false
                  }
                  isAnimationActive={false}
                  onMouseEnter={() => setHoveredUserId(s.userId)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
