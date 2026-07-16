"use client";

import { UserAvatar } from "~/app/_components/user-avatar";
import { api } from "~/trpc/react";

export function MostFollowedCard() {
  const { data, isLoading } = api.leaderboard.topFollowed.useQuery();

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-foreground/5" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-8 text-center text-foreground/50">
        Nobody has followers yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10">
      {data.map((entry, index) => (
        <div
          key={entry.id}
          className={`flex items-center gap-3 px-4 py-3 ${
            index > 0 ? "border-t border-foreground/5" : ""
          }`}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold text-foreground/60">
            {index + 1}
          </span>
          <UserAvatar
            name={entry.name}
            image={entry.image}
            size={32}
            fallbackClassName="bg-emerald-500/20 text-sm"
          />
          <span className="flex-1 font-medium">
            {entry.name ?? "Anonymous"}
          </span>
          <span className="whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
            {entry.followerCount}{" "}
            {entry.followerCount === 1 ? "follower" : "followers"}
          </span>
        </div>
      ))}
    </div>
  );
}
