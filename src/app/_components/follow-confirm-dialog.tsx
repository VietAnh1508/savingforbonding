"use client";

import { Spinner } from "./spinner";

interface FollowConfirmDialogProps {
  open: boolean;
  targetName: string | null;
  currentlyFollowingName: string | null;
  matchCount: number | undefined;
  matchCountLoading: boolean;
  backfill: boolean;
  onBackfillChange: (v: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  isUnfollow?: boolean;
}

export function FollowConfirmDialog({
  open,
  targetName,
  currentlyFollowingName,
  matchCount,
  matchCountLoading,
  backfill,
  onBackfillChange,
  onConfirm,
  onCancel,
  loading,
  isUnfollow = false,
}: FollowConfirmDialogProps) {
  if (!open) return null;

  const isSwitching = !!currentlyFollowingName;
  const displayName = targetName ?? "this user";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {isUnfollow ? (
          <>
            <h3 className="mb-2 text-base font-semibold">
              Unfollow {displayName}?
            </h3>
            <p className="mb-6 text-sm text-foreground/60">
              You&apos;ll stop copying their future votes. Your existing votes
              won&apos;t be changed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Spinner className="h-3.5 w-3.5" />}
                Unfollow
              </button>
            </div>
          </>
        ) : matchCountLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-6 w-6 text-foreground/40" />
          </div>
        ) : (
          <>
            <h3 className="mb-2 text-base font-semibold">
              {isSwitching
                ? `Switch to ${displayName}?`
                : `Follow ${displayName}?`}
            </h3>

            {isSwitching ? (
              <p className="mb-4 text-sm text-foreground/60">
                You&apos;re currently following{" "}
                <span className="font-medium text-foreground">
                  {currentlyFollowingName}
                </span>
                . Switching will stop copying their future votes. Your existing
                votes won&apos;t be changed.
              </p>
            ) : (
              <p className="mb-4 text-sm text-foreground/60">
                From now on, your votes will automatically copy theirs for each
                new match. Your existing votes won&apos;t be changed.
              </p>
            )}

            {matchCount !== undefined && matchCount > 0 && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-foreground/10 bg-foreground/5 p-3 transition hover:bg-foreground/10">
                <input
                  type="checkbox"
                  checked={backfill}
                  onChange={(e) => onBackfillChange(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-emerald-500"
                />
                <span className="text-sm text-foreground/70">
                  Also copy {isSwitching ? `${displayName}'s` : "their"} existing
                  votes for open matches
                  <span className="ml-1 text-foreground/40">
                    ({matchCount} match{matchCount === 1 ? "" : "es"} available
                    — only ones you haven&apos;t voted on yet)
                  </span>
                </span>
              </label>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-card transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Spinner className="h-3.5 w-3.5" />}
                {isSwitching ? "Switch" : "Follow"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
