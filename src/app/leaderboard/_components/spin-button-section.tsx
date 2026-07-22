"use client";

import { useState } from "react";

import { BeerAmountSpinModal } from "~/app/leaderboard/_components/beer-amount-spin-modal";
import { formatBeerAmount } from "~/lib/beer-amount-spin";
import { api } from "~/trpc/react";

export function SpinButtonSection() {
  const [open, setOpen] = useState(false);
  const { data: status } = api.beerAmountSpin.getStatus.useQuery();
  const { data: mySpin } = api.beerAmountSpin.getMySpin.useQuery();

  if (!status?.enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!!mySpin}
        className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mySpin
          ? `You picked ${formatBeerAmount(mySpin.amount)}/beer`
          : "Settle your beer price"}
      </button>
      {open && <BeerAmountSpinModal onClose={() => setOpen(false)} />}
    </>
  );
}
