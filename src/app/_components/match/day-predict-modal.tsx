"use client";

import { useEffect, useState } from "react";

import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { StarIcon } from "~/app/_components/icons/star-icon";
import { RatioDisplay } from "~/app/_components/match/ratio-display";
import { TeamFlag } from "~/app/_components/match/team-flag";
import { useToast } from "~/app/_components/toast";
import { Tooltip } from "~/app/_components/tooltip";
import { useToggleStar } from "~/app/hooks/use-toggle-star";
import { formatKickoffTime, starsAllocatedForStage } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";
import { type VoteOutcome } from "../../../../generated/prisma";

type Match = RouterOutputs["match"]["listMatches"][number];

type Selections = Record<string, VoteOutcome | null>;

function initSelections(matches: Match[]): Selections {
  return Object.fromEntries(
    matches.map((m) => [m.id, m.userVoteOutcome ?? null]),
  );
}

export function DayPredictModal({
  matches,
  dateLabel,
  onClose,
}: {
  matches: Match[];
  dateLabel: string;
  onClose: () => void;
}) {
  const [selections, setSelections] = useState<Selections>(() =>
    initSelections(matches),
  );
  // Optimistic local star state: matchId → hasStar (overrides server data until invalidated)
  const [starOverrides, setStarOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const utils = api.useUtils();
  const toast = useToast();

  const hasKnockoutMatches = matches.some(
    (m) => starsAllocatedForStage(m.stage) > 0,
  );
  const { data: starAllotments } = api.vote.getStarAllotments.useQuery(
    undefined,
    {
      enabled: hasKnockoutMatches,
    },
  );

  const toggleStar = useToggleStar({
    onMutate: ({ matchId }) => {
      const current =
        matchId in starOverrides
          ? starOverrides[matchId]
          : (matches.find((m) => m.id === matchId)?.userVoteResult?.hasStar ??
            false);
      setStarOverrides((prev) => ({ ...prev, [matchId]: !current }));
    },
    onError: (_err, { matchId }) => {
      setStarOverrides((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    },
    onSettled: () => {
      void utils.match.listMatches.invalidate();
    },
  });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const castBatch = api.vote.castBatch.useMutation({
    onSuccess: ({ saved }) => {
      void utils.match.listMatches.invalidate();
      toast.success(
        saved === 1 ? "1 prediction saved!" : `${saved} predictions saved!`,
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function select(matchId: string, outcome: VoteOutcome) {
    setSelections((prev) => ({
      ...prev,
      [matchId]: prev[matchId] === outcome ? null : outcome,
    }));
  }

  function handleSubmit() {
    const votes = matches
      .filter((m) => m.votingOpen && selections[m.id] != null)
      .map((m) => ({ matchId: m.id, outcome: selections[m.id]! }));

    if (votes.length === 0) {
      onClose();
      return;
    }

    castBatch.mutate(votes);
  }

  const votableCount = matches.filter((m) => m.votingOpen).length;
  const selectedCount = matches.filter(
    (m) => m.votingOpen && selections[m.id] != null,
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-foreground/10 bg-card shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Predictions</h2>
            <p className="text-sm text-foreground/50">{dateLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-foreground/50 transition hover:bg-foreground/10 hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Match rows */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
          {matches.map((match) => {
            const locked = !match.votingOpen;
            const selected = selections[match.id];

            const starsAllocated = starsAllocatedForStage(match.stage);
            const hasExistingVote = match.userVoteOutcome !== null;
            const isStarred =
              match.id in starOverrides
                ? (starOverrides[match.id] ?? false)
                : (match.userVoteResult?.hasStar ?? false);
            const stageAllotment = starAllotments?.find(
              (a) => a.stage === match.stage,
            );
            // Adjust remaining count for optimistic toggles in this session
            const optimisticUsed = Object.entries(starOverrides).filter(
              ([mid, starred]) =>
                starred &&
                matches.find((m) => m.id === mid)?.stage === match.stage,
            ).length;
            const serverRemaining = stageAllotment?.remaining ?? starsAllocated;
            const starsRemaining = Math.max(
              0,
              serverRemaining -
                optimisticUsed +
                (isStarred && match.id in starOverrides ? 1 : 0),
            );
            const canStar =
              starsAllocated > 0 &&
              hasExistingVote &&
              !locked &&
              (isStarred || starsRemaining > 0);

            const options = [
              {
                outcome: "HOME_WIN" as VoteOutcome,
                label: match.homeCountry,
                flag: match.homeCountry,
              },
              { outcome: "DRAW" as VoteOutcome, label: "Draw", flag: null },
              {
                outcome: "AWAY_WIN" as VoteOutcome,
                label: match.awayCountry,
                flag: match.awayCountry,
              },
            ] as const;

            return (
              <div key={match.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={
                      locked
                        ? "font-medium text-red-500 dark:text-red-400"
                        : "text-foreground/40"
                    }
                  >
                    {locked
                      ? "🔒 Voting closed"
                      : formatKickoffTime(match.kickoffAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    {starsAllocated > 0 && hasExistingVote && (
                      <Tooltip
                        label={
                          isStarred
                            ? "Remove star"
                            : `Star this pick (${starsRemaining} remaining)`
                        }
                      >
                        <button
                          type="button"
                          disabled={!canStar || toggleStar.isPending}
                          onClick={() =>
                            toggleStar.mutate({ matchId: match.id })
                          }
                          className={`transition ${
                            isStarred
                              ? "text-amber-500 dark:text-amber-400"
                              : canStar
                                ? "text-foreground/30 hover:text-amber-400"
                                : "cursor-not-allowed text-foreground/20"
                          }`}
                        >
                          <StarIcon filled={isStarred} />
                        </button>
                      </Tooltip>
                    )}
                    <RatioDisplay
                      homeRatio={match.homeRatio}
                      awayRatio={match.awayRatio}
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-3 gap-2 ${locked ? "opacity-40" : ""}`}
                >
                  {options.map(({ outcome, label, flag }) => (
                    <button
                      key={outcome}
                      type="button"
                      disabled={locked || castBatch.isPending}
                      onClick={() => select(match.id, outcome)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center text-sm font-medium transition ${
                        selected === outcome
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "border-foreground/10 bg-foreground/5 hover:border-emerald-500/40 hover:bg-foreground/10"
                      } disabled:cursor-not-allowed`}
                    >
                      {flag && <TeamFlag country={flag} size="sm" />}
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-foreground/40">
                  <span>
                    {match.voteCounts.home} voter
                    {match.voteCounts.home === 1 ? "" : "s"}
                  </span>
                  <span>
                    {match.voteCounts.draw} voter
                    {match.voteCounts.draw === 1 ? "" : "s"}
                  </span>
                  <span>
                    {match.voteCounts.away} voter
                    {match.voteCounts.away === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-foreground/10 px-6 py-4">
          <span className="text-sm text-foreground/50">
            {selectedCount}/{votableCount} selected
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={castBatch.isPending || selectedCount === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {castBatch.isPending && <SpinnerIcon className="h-4 w-4" />}
              Save predictions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

