"use client";

import Image from "next/image";
import { useState } from "react";

import { StarIcon } from "~/app/_components/icons/star-icon";
import { useToast } from "~/app/_components/toast";
import { FollowConfirmDialog } from "~/app/leaderboard/_components/follow-confirm-dialog";
import { api, type RouterOutputs } from "~/trpc/react";

import {
  formatAccuracy,
  RANK_BADGE_CLASSES,
} from "~/lib/leaderboard-constants";

type Entry = RouterOutputs["leaderboard"]["global"]["entries"][number];

const RANK_TITLES: Record<number, string> = {
  1: "The Oracle",
  2: "Sharp Eye",
  3: "Good Read",
};

function computeAccuracyRankedEntries(entries: Entry[]) {
  const sorted = [...entries].sort((a, b) => {
    if (b.correctPredictions !== a.correctPredictions)
      return b.correctPredictions - a.correctPredictions;
    return b.accuracy - a.accuracy;
  });

  const ranked: Array<Entry & { accuracyRank: number }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]!;
    const prev = ranked[i - 1];
    let accuracyRank: number;
    if (!prev) {
      accuracyRank = 1;
    } else if (
      prev.correctPredictions === entry.correctPredictions &&
      prev.accuracy === entry.accuracy
    ) {
      accuracyRank = prev.accuracyRank;
    } else {
      accuracyRank = prev.accuracyRank + 1;
    }
    ranked.push({ ...entry, accuracyRank });
  }
  return ranked;
}

export function AccuracyTable({
  entries,
  currentUserId,
}: {
  entries: Entry[];
  currentUserId?: string;
}) {
  const [pendingFollowId, setPendingFollowId] = useState<string | null>(null);
  const [pendingUnfollowId, setPendingUnfollowId] = useState<string | null>(
    null,
  );
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

  const rankedEntries = computeAccuracyRankedEntries(entries);
  const pendingEntry = rankedEntries.find((e) => e.id === pendingFollowId);
  const pendingUnfollowEntry = rankedEntries.find(
    (e) => e.id === pendingUnfollowId,
  );

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
                Accuracy
              </th>
              <th className="hidden w-px whitespace-nowrap px-4 py-3 font-medium sm:table-cell">
                W / L / M
              </th>
            </tr>
          </thead>
          <tbody>
            {rankedEntries.map((entry) => {
              const isCurrentUser =
                !!currentUserId && entry.id === currentUserId;
              const isFollowing =
                !!currentUserId && entry.id === currentFollowingId;
              const canFollow = !!currentUserId && !isCurrentUser;
              const title = RANK_TITLES[entry.accuracyRank] ?? null;

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
                    <div className="flex justify-center">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-sm font-bold text-foreground/60">
                        {entry.accuracyRank}
                      </span>
                    </div>
                  </td>
                  <td className="px-1 py-3 sm:px-2">
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
                          {[...(entry.name ?? "?")][0]}
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {entry.name ?? "Anonymous"}
                        </span>
                        {title && (
                          <span
                            className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${RANK_BADGE_CLASSES[entry.accuracyRank] ?? ""}`}
                          >
                            {title}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatAccuracy(
                      entry.correctPredictions,
                      entry.incorrectPredictions,
                    )}
                    %
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-sm sm:table-cell">
                    <span className="text-green-500">
                      {entry.correctPredictions}
                    </span>
                    <span className="mx-1 text-foreground/30">/</span>
                    <span className="text-red-500">
                      {entry.incorrectPredictions}
                    </span>
                    <span className="mx-1 text-foreground/30">/</span>
                    <span className="text-foreground/40">
                      {entry.missedPredictions}
                    </span>
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

