"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import {
  ChartTooltipCard,
  ScatterUserDot,
} from "~/app/insight/_components/scatter-chart-parts";
import { formatSigned } from "~/app/insight/_components/star-efficiency-format";
import { type RouterOutputs } from "~/trpc/react";

type Entry = RouterOutputs["leaderboard"]["starEfficiency"][number];

function StarEfficiencyTooltip({
  active,
  payload,
  currentUserId,
}: TooltipContentProps & { currentUserId?: string }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]!.payload as Entry;
  const isCurrentUser = entry.id === currentUserId;

  return (
    <ChartTooltipCard
      name={entry.name}
      image={entry.image}
      isCurrentUser={isCurrentUser}
    >
      <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">
        {formatSigned(entry.beersSavedPerStarredVote!, 1)} beers saved /
        starred vote
      </p>
      <p className="text-foreground/50">
        {Math.round(entry.starredAccuracy! * 100)}% starred accuracy
      </p>
      <p className="mt-0.5 text-xs text-foreground/40">
        based on {entry.starredVotes} starred vote
        {entry.starredVotes === 1 ? "" : "s"}
      </p>
    </ChartTooltipCard>
  );
}

export function StarEfficiencyChart({
  entries,
  currentUserId,
}: {
  entries: Entry[];
  currentUserId?: string;
}) {
  const starUsers = entries.filter((e) => e.starredVotes > 0);

  if (starUsers.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-8 text-center text-foreground/50">
        No starred votes have resolved yet.
      </div>
    );
  }

  const maxStarredVotes = Math.max(...starUsers.map((e) => e.starredVotes));
  const chartData = starUsers.map((entry) => ({
    ...entry,
    starredAccuracyPct: entry.starredAccuracy! * 100,
    // Bubble radius scales with sample size so low-N users read as
    // visually less certain rather than being silently hidden or
    // crowning the ranking on a couple of lucky picks.
    bubbleRadius: 4 + (entry.starredVotes / maxStarredVotes) * 8,
  }));

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4">
      <p className="mb-2 text-xs text-foreground/40">
        Dot size reflects number of starred votes — bigger dots are more
        reliable.
      </p>
      <ResponsiveContainer width="100%" height={480}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <XAxis
            type="number"
            dataKey="starredAccuracyPct"
            domain={[0, 100]}
            unit="%"
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Starred accuracy",
              position: "insideBottom",
              offset: -10,
              fill: "currentColor",
              opacity: 0.5,
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="beersSavedPerStarredVote"
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            width={40}
            label={{
              value: "Beers saved / starred vote",
              angle: -90,
              position: "insideLeft",
              fill: "currentColor",
              opacity: 0.5,
              fontSize: 12,
            }}
          />
          <Tooltip
            content={(props) => (
              <StarEfficiencyTooltip {...props} currentUserId={currentUserId} />
            )}
          />
          <Scatter
            data={chartData}
            isAnimationActive={false}
            shape={(props) => {
              const entry = props.payload as { bubbleRadius: number };
              return (
                <ScatterUserDot
                  {...props}
                  currentUserId={currentUserId}
                  radius={entry.bubbleRadius}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
