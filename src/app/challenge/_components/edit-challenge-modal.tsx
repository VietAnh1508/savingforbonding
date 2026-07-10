"use client";

import { useState } from "react";

import { CloseIcon } from "~/app/_components/icons/close-icon";
import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { useToast } from "~/app/_components/toast";
import { useModalDismiss } from "~/app/hooks/use-modal-dismiss";
import { maxStakeBeers } from "~/lib/challenge";
import { formatBeers } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Challenge = RouterOutputs["challenge"]["listMine"][number];

export function EditChallengeModal({
  challenge,
  onClose,
}: {
  challenge: Challenge;
  onClose: () => void;
}) {
  useModalDismiss(onClose);
  const toast = useToast();
  const utils = api.useUtils();

  // Reuses the create-modal context query to get fresh totalPoints for the
  // cap — the challenge list only carries id/name/image for each side.
  const { data, isLoading } = api.challenge.getCreateContext.useQuery();
  const opponent =
    data?.others.find((o) => o.id === challenge.opponentId) ?? null;
  const cap = opponent
    ? maxStakeBeers(data?.myTotalPoints ?? 0, opponent.totalPoints)
    : challenge.stakeBeers;

  const [stakeBeers, setStakeBeers] = useState(challenge.stakeBeers);
  const [condition, setCondition] = useState(challenge.condition);

  const updateMut = api.challenge.update.useMutation({
    onSuccess: () => {
      void utils.challenge.listMine.invalidate();
      void utils.challenge.listCommunity.invalidate();
      toast.success("Challenge updated");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const canSubmit =
    stakeBeers >= 1 && stakeBeers <= cap && condition.trim().length > 0;

  function handleSubmit() {
    updateMut.mutate({
      id: challenge.id,
      stakeBeers,
      condition: condition.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-foreground/10 bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/10 bg-card px-6 py-4">
          <h2 className="text-lg font-semibold">Edit challenge</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground/50 transition hover:bg-foreground/10 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-6 px-6 py-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <SpinnerIcon className="h-6 w-6 text-foreground/40" />
            </div>
          )}

          {!isLoading && (
            <>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                  How many beers?
                </h3>
                {opponent && (
                  <p className="mb-2 text-xs text-foreground/50">
                    You: {formatBeers(data?.myTotalPoints ?? 0)} ·{" "}
                    {opponent.name ?? "Anonymous"}:{" "}
                    {formatBeers(opponent.totalPoints)} · max stake:{" "}
                    {formatBeers(cap)}
                  </p>
                )}
                <input
                  type="number"
                  min={1}
                  max={cap}
                  value={stakeBeers}
                  onChange={(e) =>
                    setStakeBeers(
                      Math.max(1, Math.min(cap, Number(e.target.value) || 1)),
                    )
                  }
                  className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm"
                />
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                  What&apos;s the outcome?
                </h3>
                <textarea
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm"
                />
              </section>
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-foreground/10 bg-card px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit || updateMut.isPending}
            onClick={handleSubmit}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateMut.isPending && <SpinnerIcon className="h-3.5 w-3.5" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
