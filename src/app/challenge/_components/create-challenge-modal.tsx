"use client";

import { useState } from "react";

import { CloseIcon } from "~/app/_components/icons/close-icon";
import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { useToast } from "~/app/_components/toast";
import { UserAvatar } from "~/app/_components/user-avatar";
import { useModalDismiss } from "~/app/hooks/use-modal-dismiss";
import { maxStakeBeers } from "~/lib/challenge";
import { formatDateTime } from "~/lib/datetime";
import { formatBeers } from "~/lib/match";
import { api } from "~/trpc/react";

export function CreateChallengeModal({ onClose }: { onClose: () => void }) {
  useModalDismiss(onClose);
  const toast = useToast();
  const utils = api.useUtils();

  const { data, isLoading } = api.challenge.getCreateContext.useQuery();

  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [stakeBeers, setStakeBeers] = useState<number>(1);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [condition, setCondition] = useState("");

  const createMut = api.challenge.create.useMutation({
    onSuccess: () => {
      void utils.challenge.listMine.invalidate();
      void utils.challenge.getOpenIncomingCount.invalidate();
      toast.success("Challenge sent");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const opponent = data?.others.find((o) => o.id === opponentId) ?? null;
  const cap = opponent
    ? maxStakeBeers(data?.myTotalPoints ?? 0, opponent.totalPoints)
    : 0;

  const canSubmit =
    !!opponentId &&
    !!matchId &&
    stakeBeers >= 1 &&
    stakeBeers <= cap &&
    condition.trim().length > 0;

  function handleSubmit() {
    if (!opponentId || !matchId) return;
    createMut.mutate({
      opponentId,
      matchId,
      stakeBeers,
      condition: condition.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-foreground/10 bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-foreground/10 bg-card px-6 py-4">
          <h2 className="text-lg font-semibold">New challenge</h2>
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

          {data && (
            <>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                  1. Who are you challenging?
                </h3>
                <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-foreground/10 p-2">
                  {data.others.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setOpponentId(o.id);
                        setStakeBeers(1);
                      }}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                        opponentId === o.id
                          ? "bg-emerald-500/20"
                          : "hover:bg-foreground/5"
                      }`}
                    >
                      <UserAvatar
                        name={o.name}
                        image={o.image}
                        size={28}
                        fallbackClassName="bg-emerald-500/20 text-sm"
                      />
                      <span className="flex-1 text-sm">
                        {o.name ?? "Anonymous"}
                      </span>
                      <span className="text-xs text-foreground/50">
                        {formatBeers(o.totalPoints)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {opponent && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                    2. How many beers?
                  </h3>
                  <p className="mb-2 text-xs text-foreground/50">
                    You: {formatBeers(data.myTotalPoints)} · {opponent.name ?? "Anonymous"}:{" "}
                    {formatBeers(opponent.totalPoints)} · max stake:{" "}
                    {formatBeers(cap)}
                  </p>
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
                    disabled={cap < 1}
                    className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm disabled:opacity-50"
                  />
                  {cap < 1 && (
                    <p className="mt-1 text-xs text-red-500">
                      One of you has no beers to stake.
                    </p>
                  )}
                </section>
              )}

              {opponent && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                    3. Which match?
                  </h3>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-foreground/10 p-2">
                    {data.matches.length === 0 && (
                      <p className="px-3 py-2 text-sm text-foreground/50">
                        No upcoming matches available.
                      </p>
                    )}
                    {data.matches.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMatchId(m.id)}
                        className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm transition ${
                          matchId === m.id
                            ? "bg-emerald-500/20"
                            : "hover:bg-foreground/5"
                        }`}
                      >
                        {m.homeCountry} vs {m.awayCountry}
                        <span className="ml-2 text-xs text-foreground/50">
                          {formatDateTime(m.kickoffAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {matchId && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                    4. What&apos;s the outcome?
                  </h3>
                  <textarea
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="e.g. Team A scores first in the first half"
                    className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm"
                  />
                </section>
              )}
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
            disabled={!canSubmit || createMut.isPending}
            onClick={handleSubmit}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMut.isPending && <SpinnerIcon className="h-3.5 w-3.5" />}
            Send challenge
          </button>
        </div>
      </div>
    </div>
  );
}
