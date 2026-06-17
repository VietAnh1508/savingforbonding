"use client";

import { useEffect, useRef, useState } from "react";

import { Spinner } from "~/app/_components/spinner";
import { useToast } from "~/app/_components/toast";
import { api, type RouterOutputs } from "~/trpc/react";

type Match = RouterOutputs["match"]["listUpcoming"][number];

export function QuickVoteButton({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();
  const toast = useToast();

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
      toast.success("Prediction saved!");
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
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${
          currentVote
            ? "border border-emerald-500/50 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30"
            : "bg-emerald-600 text-white hover:bg-emerald-500"
        }`}
      >
        {castVote.isPending && <Spinner className="h-3 w-3" />}
        {currentVote ? "Change predicted" : "Predict"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-1 min-w-[8rem] overflow-hidden rounded-lg border border-foreground/10 bg-card shadow-xl"
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
              className={`w-full px-4 py-2 text-left text-sm transition hover:bg-foreground/10 ${
                currentVote === outcome
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "text-foreground/80"
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
