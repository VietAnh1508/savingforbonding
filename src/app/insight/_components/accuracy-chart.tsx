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
import { type RouterOutputs } from "~/trpc/react";

import { formatAccuracy } from "~/lib/leaderboard-constants";

type Entry = RouterOutputs["leaderboard"]["global"]["entries"][number];

function getParticipationRate(entry: Entry) {
  const total =
    entry.correctPredictions +
    entry.incorrectPredictions +
    entry.missedPredictions;
  if (total === 0) return 0;
  return (entry.correctPredictions + entry.incorrectPredictions) / total;
}

function AccuracyTooltip({
  active,
  payload,
  currentUserId,
}: TooltipContentProps & { currentUserId?: string }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]!.payload as Entry;
  const isCurrentUser = entry.id === currentUserId;
  const participationPct = Math.round(getParticipationRate(entry) * 100);

  return (
    <ChartTooltipCard
      name={entry.name}
      image={entry.image}
      isCurrentUser={isCurrentUser}
    >
      <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">
        {formatAccuracy(entry.correctPredictions, entry.incorrectPredictions)}%
        accuracy
      </p>
      <p className="text-foreground/50">{participationPct}% participation</p>
      <p className="mt-0.5 text-xs">
        <span className="text-green-500">{entry.correctPredictions}</span>
        <span className="mx-1 text-foreground/30">/</span>
        <span className="text-red-500">{entry.incorrectPredictions}</span>
        <span className="mx-1 text-foreground/30">/</span>
        <span className="text-foreground/40">{entry.missedPredictions}</span>
      </p>
    </ChartTooltipCard>
  );
}

export function AccuracyChart({
  entries,
  currentUserId,
}: {
  entries: Entry[];
  currentUserId?: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-8 text-center text-foreground/50">
        No registered users yet.
      </div>
    );
  }

  const chartData = entries.map((entry) => ({
    ...entry,
    participationRate: getParticipationRate(entry) * 100,
    accuracyPct: entry.accuracy * 100,
  }));

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4">
      <p className="mb-2 text-xs text-foreground/40">Hover a dot for details.</p>
      <ResponsiveContainer width="100%" height={480}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <XAxis
            type="number"
            dataKey="participationRate"
            domain={[0, 100]}
            unit="%"
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Participation rate",
              position: "insideBottom",
              offset: -10,
              fill: "currentColor",
              opacity: 0.5,
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="accuracyPct"
            domain={[0, 100]}
            unit="%"
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            width={40}
            label={{
              value: "Accuracy",
              angle: -90,
              position: "insideLeft",
              fill: "currentColor",
              opacity: 0.5,
              fontSize: 12,
            }}
          />
          <Tooltip
            content={(props) => (
              <AccuracyTooltip {...props} currentUserId={currentUserId} />
            )}
          />
          <Scatter
            data={chartData}
            isAnimationActive={false}
            shape={(props) => (
              <ScatterUserDot {...props} currentUserId={currentUserId} />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
