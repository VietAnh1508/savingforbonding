"use client";

import Image from "next/image";
import { useState } from "react";

import { FollowConfirmDialog } from "~/app/_components/follow-confirm-dialog";
import { useToast } from "~/app/_components/toast";
import { formatJoiningDate } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Entry = RouterOutputs["leaderboard"]["global"]["entries"][number];

const RANK_BADGE_CLASSES: Record<number, string> = {
  1: "bg-yellow-400/20 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300",
  2: "bg-slate-400/20 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
  3: "bg-amber-600/20 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const RANK_TITLES: Record<number, string> = {
  1: "The Hand of God",
  2: "National Prider",
  3: "Doctor of Prediction",
};

function titleForRank(rank: number): string | null {
  return RANK_TITLES[rank] ?? null;
}

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
        clipRule="evenodd"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
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
  const [pendingUnfollowId, setPendingUnfollowId] = useState<string | null>(null);
  const [backfill, setBackfill] = useState(false);

  const toast = useToast();
  const utils = api.useUtils();

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
              <th className="px-2 py-3 text-center font-medium sm:px-4">Rank</th>
              <th className="px-2 py-3 font-medium sm:px-4">Player</th>
              <th className="px-4 py-3 text-right font-medium">{beersLabel}</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Joining Date</th>
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
                  <td className="px-2 py-3 sm:px-4">
                    <div className="flex justify-center">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold text-foreground/60">
                        {entry.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 sm:px-4">
                    <div className="flex items-center gap-3">
                      {entry.image ? (
                        <Image
                          src={entry.image}
                          alt={entry.name ?? "User"}
                          width={32}
                          height={32}
                          className="shrink-0 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm">
                          {(entry.name ?? "?")[0]}
                        </div>
                      )}
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
                  <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                    <div className="flex items-center justify-end gap-2">
                      {canFollow && (
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
                      )}
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
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-foreground/60 sm:table-cell">
                    {formatJoiningDate(entry.joiningDate)}
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
