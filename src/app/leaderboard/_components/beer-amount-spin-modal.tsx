"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BeerWheel } from "~/app/leaderboard/_components/beer-wheel";
import { CloseIcon } from "~/app/_components/icons/close-icon";
import { useModalDismiss } from "~/app/hooks/use-modal-dismiss";
import { useToast } from "~/app/_components/toast";
import {
  formatBeerAmount,
  rotationForAmount,
  type BeerAmount,
} from "~/lib/beer-amount-spin";
import { api } from "~/trpc/react";

interface BeerAmountSpinModalProps {
  onClose: () => void;
}

type Phase = "idle" | "spinning" | "done" | "error";

/**
 * Only render this when the caller knows the player hasn't spun yet
 * (`SpinButtonSection` disables the button that opens it once they have) —
 * it always starts fresh at "idle", it doesn't check for a pre-existing spin.
 */
export function BeerAmountSpinModal({ onClose }: BeerAmountSpinModalProps) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();

  const spinMut = api.beerAmountSpin.spin.useMutation();

  const [phase, setPhase] = useState<Phase>("idle");
  const [rotation, setRotation] = useState(0);
  const [resultAmount, setResultAmount] = useState<number | null>(null);

  const canDismiss = phase !== "spinning";
  useModalDismiss(canDismiss ? onClose : () => undefined);

  async function handleSpinClick() {
    setPhase("spinning");
    try {
      const result = await spinMut.mutateAsync();
      setResultAmount(result.amount);
      setRotation(rotationForAmount(result.amount as BeerAmount));
    } catch {
      setPhase("error");
    }
  }

  async function handleSpinComplete() {
    setPhase("done");
    toast.success("You've picked your beer price!");
    await utils.beerAmountSpin.getMySpin.invalidate();
    router.refresh();
  }

  function handleTryAgain() {
    setPhase("idle");
    spinMut.reset();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60"
      onClick={canDismiss ? onClose : undefined}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-card p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Settle your beer price</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={!canDismiss}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1 text-foreground/50 transition hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <BeerWheel
          rotation={rotation}
          spinning={phase === "spinning"}
          onSpinComplete={handleSpinComplete}
        />

        {phase === "idle" && (
          <>
            <p className="mt-4 text-xs text-foreground/50">
              Once you spin, you&apos;re locked into this amount — there&apos;s
              no retry.
            </p>
            <button
              type="button"
              onClick={handleSpinClick}
              className="mt-4 cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
            >
              Spin!
            </button>
          </>
        )}

        {phase === "spinning" && (
          <p className="mt-4 text-sm text-foreground/60">Spinning...</p>
        )}

        {phase === "done" && (
          <>
            <p className="mt-4 text-lg">
              You&apos;ll pay{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {resultAmount !== null && formatBeerAmount(resultAmount)}
              </span>{" "}
              per beer.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground"
            >
              Close
            </button>
          </>
        )}

        {phase === "error" && (
          <>
            <p className="mt-4 text-sm text-red-400">
              {spinMut.error?.message ?? "Something went wrong."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTryAgain}
                className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
