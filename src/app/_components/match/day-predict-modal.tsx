"use client";

import { useState } from "react";

import { CloseIcon } from "~/app/_components/icons/close-icon";
import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { OutcomePicker } from "~/app/_components/match/outcome-picker";
import { RatioDisplay } from "~/app/_components/match/ratio-display";
import { STAR_TIERS, StarTierButtons } from "~/app/_components/star-tier-buttons";
import { useToast } from "~/app/_components/toast";
import { useModalDismiss } from "~/app/hooks/use-modal-dismiss";
import { useToggleStar } from "~/app/hooks/use-toggle-star";
import { formatKickoffTime, isGatedStarTier, voterLabel } from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";
import { type VoteOutcome, type VoteStarTier } from "../../../../generated/prisma";

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
  // Optimistic local star state: matchId → starTier (overrides server data until invalidated)
  const [starOverrides, setStarOverrides] = useState<
    Record<string, VoteStarTier | null>
  >({});
  const utils = api.useUtils();
  const toast = useToast();

  const hasStageStarBudget = matches.some((m) => m.stageStarsAllocated > 0);
  const { data: starAllotments } = api.vote.getStarAllotments.useQuery(
    undefined,
    {
      enabled: hasStageStarBudget,
    },
  );

  const toggleStar = useToggleStar({
    onMutate: ({ matchId, tier }) => {
      const current =
        matchId in starOverrides
          ? starOverrides[matchId]
          : (matches.find((m) => m.id === matchId)?.userVoteResult?.starTier ??
            null);
      setStarOverrides((prev) => ({
        ...prev,
        [matchId]: current === tier ? null : tier,
      }));
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

  useModalDismiss(onClose);

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
            <CloseIcon />
          </button>
        </div>

        {/* Match rows */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
          {matches.map((match) => {
            const locked = !match.votingOpen;
            const selected = selections[match.id];

            const starsAllocated = match.stageStarsAllocated;
            const hasExistingVote = match.userVoteOutcome !== null;
            const currentTier =
              match.id in starOverrides
                ? (starOverrides[match.id] ?? null)
                : (match.userVoteResult?.starTier ?? null);
            const isStarred = currentTier != null;
            const stageAllotment = starAllotments?.find(
              (a) => a.stage === match.stage,
            );
            // Adjust the server's remaining count for this session's pending
            // overrides — only a null→tier change spends a star and only a
            // tier→null change frees one; switching between YELLOW and RED on
            // an already-starred vote is net zero.
            const stageDelta = matches
              .filter((m) => m.stage === match.stage && m.id in starOverrides)
              .reduce((sum, m) => {
                const original = m.userVoteResult?.starTier ?? null;
                const effective = starOverrides[m.id] ?? null;
                if (original == null && effective != null) return sum + 1;
                if (original != null && effective == null) return sum - 1;
                return sum;
              }, 0);
            const serverRemaining = stageAllotment?.remaining ?? starsAllocated;
            const starsRemaining = Math.max(0, serverRemaining - stageDelta);
            // Whether a NEW star (either tier) can be placed on this vote
            const canStar =
              starsAllocated > 0 &&
              hasExistingVote &&
              !locked &&
              (isStarred || starsRemaining > 0);

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
                      <StarTierButtons
                        tiers={STAR_TIERS.filter(
                          (tier) =>
                            !isGatedStarTier(tier) ||
                            match.redStarEligible ||
                            currentTier === tier,
                        )}
                        activeTier={currentTier}
                        isTierDisabled={(tier) =>
                          toggleStar.isPending ||
                          locked ||
                          (currentTier !== tier && !canStar)
                        }
                        onToggle={(tier) =>
                          toggleStar.mutate({ matchId: match.id, tier })
                        }
                        gapClassName="gap-0.5"
                      />
                    )}
                    <RatioDisplay
                      homeRatio={match.homeRatio}
                      awayRatio={match.awayRatio}
                    />
                  </div>
                </div>

                <OutcomePicker
                  homeCountry={match.homeCountry}
                  awayCountry={match.awayCountry}
                  selectedOutcome={selected}
                  onSelect={(outcome) => select(match.id, outcome)}
                  disabled={locked || castBatch.isPending}
                  size="compact"
                  showFlags
                />
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-foreground/40">
                  <span>{voterLabel(match.voteCounts.home)}</span>
                  <span>{voterLabel(match.voteCounts.draw)}</span>
                  <span>{voterLabel(match.voteCounts.away)}</span>
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

