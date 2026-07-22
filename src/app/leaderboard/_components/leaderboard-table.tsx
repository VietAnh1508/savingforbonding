"use client";

import { useMemo, useState } from "react";

import { StarIcon } from "~/app/_components/icons/star-icon";
import { useToast } from "~/app/_components/toast";
import { UserAvatar } from "~/app/_components/user-avatar";
import { FollowConfirmDialog } from "~/app/leaderboard/_components/follow-confirm-dialog";
import { RankGapBadge } from "~/app/leaderboard/_components/rank-gap-badge";
import { formatBeerAmount } from "~/lib/beer-amount-spin";
import { api, type RouterOutputs } from "~/trpc/react";

import {
  formatAccuracy,
  RANK_BADGE_CLASSES,
} from "~/lib/leaderboard-constants";

type Entry = RouterOutputs["leaderboard"]["global"]["entries"][number];

const RANK_TITLES: Record<number, string> = {
  1: "The Hand of God",
  2: "National Prider",
  3: "Doctor of Prediction",
};

function titleForRank(rank: number): string | null {
  return RANK_TITLES[rank] ?? null;
}

export function LeaderboardTable({
  entries,
  beersLabel = "Beers",
  currentUserId,
}: {
  entries: Entry[];
  beersLabel?: string;
  currentUserId?: string;
}) {
  const [pendingFollowId, setPendingFollowId] = useState<string | null>(null);
  const [pendingUnfollowId, setPendingUnfollowId] = useState<string | null>(
    null,
  );
  const [backfill, setBackfill] = useState(false);

  const toast = useToast();
  const utils = api.useUtils();

  const { data: rankHistory } = api.leaderboard.rankByDay.useQuery();
  const rankGaps = useMemo(() => {
    const days = rankHistory?.days ?? [];
    if (days.length < 2) return {};
    const current = days[days.length - 1]!.ranks;
    const previous = days[days.length - 2]!.ranks;
    const gaps: Record<string, number> = {};
    for (const [userId, rank] of Object.entries(current)) {
      const prevRank = previous[userId];
      if (prevRank !== undefined) gaps[userId] = prevRank - rank;
    }
    return gaps;
  }, [rankHistory]);

  const { data: followingData } = api.vote.getFollowing.useQuery(undefined, {
    enabled: !!currentUserId,
  });
  const currentFollowingId = followingData?.followingId ?? null;
  const currentFollowingName = followingData?.following.name ?? null;

  const { data: matchCountData, isLoading: matchCountLoading } =
    api.vote.getOpenMatchCountForFollow.useQuery(
      { userId: pendingFollowId ?? "" },
      { enabled: !!pendingFollowId },
    );

  const followMut = api.vote.follow.useMutation({
    onSuccess: () => utils.vote.getFollowing.invalidate(),
  });
  const unfollowMut = api.vote.unfollow.useMutation({
    onSuccess: () => utils.vote.getFollowing.invalidate(),
  });
  const copyMut = api.vote.copyFromUser.useMutation({
    onSuccess: () => utils.vote.getMyVotes.invalidate(),
  });

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-8 text-center text-foreground/50">
        No registered users yet.
      </div>
    );
  }

  const rankOrder = [...new Set(entries.map((e) => e.rank))]
    .sort((a, b) => a - b)
    .reduce<Record<number, number>>((acc, rank, i) => {
      acc[rank] = i + 1;
      return acc;
    }, {});

  const pendingEntry = entries.find((e) => e.id === pendingFollowId);
  const pendingUnfollowEntry = entries.find((e) => e.id === pendingUnfollowId);

  async function handleConfirm() {
    if (!pendingFollowId) return;
    const name = pendingEntry?.name ?? "player";
    try {
      await followMut.mutateAsync({ userId: pendingFollowId });
      if (backfill) {
        await copyMut.mutateAsync({ userId: pendingFollowId });
      }
      toast.success(`Now following ${name}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPendingFollowId(null);
      setBackfill(false);
    }
  }

  function handleCancel() {
    setPendingFollowId(null);
    setBackfill(false);
  }

  async function handleUnfollowConfirm() {
    const name = pendingUnfollowEntry?.name ?? "player";
    try {
      await unfollowMut.mutateAsync();
      toast.success(`Unfollowed ${name}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPendingUnfollowId(null);
    }
  }

  function handleUnfollowCancel() {
    setPendingUnfollowId(null);
  }

  function handleFollowClick(entryId: string) {
    if (entryId === currentFollowingId) {
      setPendingUnfollowId(entryId);
    } else {
      setPendingFollowId(entryId);
    }
  }

  const confirmLoading = followMut.isPending || copyMut.isPending;

  return (
    <>
      <FollowConfirmDialog
        open={!!pendingFollowId}
        targetName={pendingEntry?.name ?? null}
        currentlyFollowingName={
          currentFollowingId ? (currentFollowingName ?? "Anonymous") : null
        }
        matchCount={matchCountData?.count}
        matchCountLoading={matchCountLoading}
        backfill={backfill}
        onBackfillChange={setBackfill}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        loading={confirmLoading}
      />
      <FollowConfirmDialog
        open={!!pendingUnfollowId}
        targetName={pendingUnfollowEntry?.name ?? null}
        currentlyFollowingName={null}
        matchCount={undefined}
        matchCountLoading={false}
        backfill={false}
        onBackfillChange={() => undefined}
        onConfirm={handleUnfollowConfirm}
        onCancel={handleUnfollowCancel}
        loading={unfollowMut.isPending}
        isUnfollow
      />

      <div className="overflow-hidden rounded-xl border border-foreground/10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5 text-left text-sm text-foreground/60">
              {currentUserId && (
                <th className="w-8 px-1 py-3 text-center font-medium sm:px-2">
                  Copy
                </th>
              )}
              <th className="px-1 py-3 text-center font-medium sm:px-2">
                Rank
              </th>
              <th className="px-1 py-3 font-medium sm:px-2">Player</th>
              <th className="w-px whitespace-nowrap px-4 py-3 text-right font-medium">
                {beersLabel}
              </th>
              <th className="w-px whitespace-nowrap px-4 py-3 text-right font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isCurrentUser =
                !!currentUserId && entry.id === currentUserId;
              const isFollowing =
                !!currentUserId && entry.id === currentFollowingId;
              const canFollow = !!currentUserId && !isCurrentUser;
              const title = titleForRank(rankOrder[entry.rank] ?? 0);

              return (
                <tr
                  key={entry.id}
                  className={`border-b border-foreground/5 transition ${
                    isCurrentUser
                      ? "border-l-2 border-l-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/15"
                      : "hover:bg-foreground/5"
                  }`}
                >
                  {currentUserId && (
                    <td className="px-1 py-3 sm:px-2">
                      <div className="flex justify-center">
                        {canFollow ? (
                          <span className="group relative">
                            <button
                              type="button"
                              onClick={() => handleFollowClick(entry.id)}
                              aria-label={
                                isFollowing
                                  ? `Unfollow ${entry.name ?? "user"}`
                                  : `Follow ${entry.name ?? "user"}`
                              }
                              className={`cursor-pointer rounded p-0.5 transition ${
                                isFollowing
                                  ? "text-emerald-500 hover:text-emerald-400"
                                  : "text-foreground/30 hover:text-foreground/60"
                              }`}
                            >
                              <StarIcon filled={isFollowing} />
                            </button>
                            <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-normal text-white shadow-lg ring-1 ring-white/10 group-hover:block">
                              {isFollowing
                                ? `Unfollow ${entry.name ?? "player"}`
                                : `Copy votes from ${entry.name ?? "player"}`}
                            </span>
                          </span>
                        ) : (
                          <span className="h-5 w-5" />
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-1 py-3 sm:px-2">
                    <div className="flex items-center justify-center">
                      <span className="flex w-7 shrink-0 justify-end pr-1">
                        <RankGapBadge gap={rankGaps[entry.id]} />
                      </span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold text-foreground/60">
                        {entry.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-1 py-3 sm:px-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={entry.name}
                        image={entry.image}
                        size={32}
                        fallbackClassName="bg-emerald-500/20 text-sm"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {entry.name ?? "Anonymous"}
                        </span>
                        {title && (
                          <span
                            className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${RANK_BADGE_CLASSES[rankOrder[entry.rank] ?? 0]}`}
                          >
                            {title}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                    <div className="flex items-center justify-end">
                      <span
                        className="group relative inline-block cursor-help outline-none"
                        tabIndex={0}
                      >
                        {entry.beers}
                        <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-normal text-white shadow-lg ring-1 ring-white/10 group-hover:block group-focus-within:block">
                          <span className="text-green-400">
                            {entry.correctPredictions}
                          </span>
                          <span className="mx-1 text-white/30">/</span>
                          <span className="text-red-400">
                            {entry.incorrectPredictions}
                          </span>
                          <span className="mx-1 text-white/30">/</span>
                          <span className="text-white/40">
                            {entry.missedPredictions}
                          </span>
                          <span className="ml-2 text-amber-400">
                            (
                            {formatAccuracy(
                              entry.correctPredictions,
                              entry.incorrectPredictions,
                            )}
                            %)
                          </span>
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    {entry.amount !== null ? (
                      <span className="font-medium text-foreground/80">
                        {formatBeerAmount(entry.amount)}
                      </span>
                    ) : (
                      <span className="text-foreground/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
