"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatAxisDate } from "~/app/insight/_components/format-axis-date";
import { api } from "~/trpc/react";

export function BeerAccumulationChart() {
  const { data, isLoading } = api.leaderboard.beerByDay.useQuery();

  if (isLoading) {
    return (
      <div className="mt-8 h-56 animate-pulse rounded-xl bg-foreground/5" />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-foreground/10 bg-foreground/5 p-6 text-center text-sm text-foreground/40">
        No completed matches yet — check back after the first game.
      </div>
    );
  }

  const minWidth = Math.max(560, data.length * 56);

  return (
    <div className="mt-8">
      <p className="mb-4 text-sm font-medium uppercase tracking-wide text-foreground/50">
        Beer accumulation by day
      </p>
      <div className="overflow-x-auto rounded-xl border border-foreground/10 bg-foreground/5 p-4">
        <div style={{ minWidth }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="beerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload as {
                    date: string;
                    daily: number;
                    cumulative: number;
                  };
                  return (
                    <div className="rounded-lg border border-foreground/10 bg-white px-3 py-2 text-sm shadow-lg dark:bg-neutral-900">
                      <p className="font-semibold text-foreground">
                        {formatAxisDate(label as string)}
                      </p>
                      <p className="text-amber-600 dark:text-amber-400">
                        🍺 {item.cumulative} total
                      </p>
                      <p className="text-foreground/50">
                        {item.daily > 0 ? "+" : ""}
                        {item.daily} this day
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#d97706"
                strokeWidth={2}
                fill="url(#beerGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
