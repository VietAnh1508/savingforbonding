"use client";

import { useEffect, useRef, useState } from "react";

import { Spinner } from "~/app/_components/spinner";
import { api, type RouterOutputs } from "~/trpc/react";

type Match = RouterOutputs["match"]["listUpcoming"][number];

export function QuickBetButton({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const castVote = api.vote.cast.useMutation({
    onSuccess: () => {
      void utils.match.listUpcoming.invalidate();
    },
  });

  const currentVote = match.userVoteOutcome;

  const options = [
    { outcome: "HOME_WIN" as const, label: match.homeCountry },
    { outcome: "DRAW" as const, label: "Draw" },
    { outcome: "AWAY_WIN" as const, label: match.awayCountry },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={castVote.isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {castVote.isPending && <Spinner className="h-3 w-3" />}
        {currentVote ? "Change predicted" : "Predict"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-1 min-w-[8rem] overflow-hidden rounded-lg border border-white/10 bg-[#1a2e1a] shadow-xl"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {options.map(({ outcome, label }) => (
            <button
              key={outcome}
              type="button"
              onClick={() => {
                setOpen(false);
                castVote.mutate({ matchId: match.id, outcome });
              }}
              className={`w-full px-4 py-2 text-left text-sm transition hover:bg-white/10 ${
                currentVote === outcome
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-white/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
