"use client";

import { useState } from "react";

import { SubmitButton } from "~/app/_components/submit-button";
import { useToast } from "~/app/_components/toast";
import {
  BEER_WIN,
  noVotePenaltyForStage,
  validateStagePenalty,
  validateStageStars,
  wrongPenaltyForStage,
} from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Stage = RouterOutputs["admin"]["listStagePenalties"][number];

function StageRow({ stage }: { stage: Stage }) {
  const utils = api.useUtils();
  const toast = useToast();

  const [wrongPenalty, setWrongPenalty] = useState(
    wrongPenaltyForStage(stage.penalty),
  );
  const [noVotePenalty, setNoVotePenalty] = useState(
    noVotePenaltyForStage(stage.penalty),
  );
  const [starsAllocated, setStarsAllocated] = useState(stage.starsAllocated);
  const [formError, setFormError] = useState<string | null>(null);

  const updatePenalty = api.admin.updateStagePenalty.useMutation();
  const updateStars = api.admin.updateStageStars.useMutation();

  async function handleSave() {
    if (
      Number.isNaN(wrongPenalty) ||
      Number.isNaN(noVotePenalty) ||
      Number.isNaN(starsAllocated)
    ) {
      setFormError("Values must be valid numbers");
      return;
    }

    const penaltyError = validateStagePenalty(wrongPenalty, noVotePenalty);
    const starsError = validateStageStars(starsAllocated);
    const error = penaltyError ?? starsError;
    if (error) {
      setFormError(error);
      return;
    }

    setFormError(null);
    try {
      await Promise.all([
        updatePenalty.mutateAsync({
          stageId: stage.id,
          wrongPenalty,
          noVotePenalty,
        }),
        updateStars.mutateAsync({
          stageId: stage.id,
          starsAllocated,
        }),
      ]);
      await utils.admin.listStagePenalties.invalidate();
      toast.success(`${stage.name} settings saved`);
    } catch {
      // surfaced via updatePenalty.error/updateStars.error below
    }
  }

  const locked = stage.hasCompletedMatch;
  const inputClass =
    "w-20 rounded-lg border border-foreground/10 bg-foreground/10 px-2 py-1 text-sm disabled:opacity-50";

  return (
    <tr className="border-b border-foreground/5 last:border-0">
      <td className="py-2 pr-4">
        {stage.name}
        {stage.isKnockout && (
          <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground/50">
            Knockout
          </span>
        )}
      </td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min="0"
          step="1"
          value={Number.isNaN(wrongPenalty) ? "" : wrongPenalty}
          onChange={(e) => setWrongPenalty(e.target.valueAsNumber)}
          disabled={locked}
          className={inputClass}
        />
      </td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min="0"
          step="1"
          value={Number.isNaN(noVotePenalty) ? "" : noVotePenalty}
          onChange={(e) => setNoVotePenalty(e.target.valueAsNumber)}
          disabled={locked}
          className={inputClass}
        />
      </td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min="0"
          step="1"
          value={Number.isNaN(starsAllocated) ? "" : starsAllocated}
          onChange={(e) => setStarsAllocated(e.target.valueAsNumber)}
          disabled={locked}
          className={inputClass}
        />
      </td>
      <td className="py-2">
        {locked ? (
          <p className="text-xs text-foreground/40">
            Locked — stage has completed matches
          </p>
        ) : (
          <form action={handleSave} className="w-20">
            <SubmitButton size="sm">Save</SubmitButton>
            {(formError ?? updatePenalty.error ?? updateStars.error) && (
              <p className="mt-1 text-xs text-red-400">
                {formError ??
                  updatePenalty.error?.message ??
                  updateStars.error?.message}
              </p>
            )}
          </form>
        )}
      </td>
    </tr>
  );
}

function RedStarThresholdControl({ stages }: { stages: Stage[] }) {
  const utils = api.useUtils();
  const toast = useToast();
  const setThreshold = api.admin.setRedStarStartStage.useMutation({
    onSuccess: async () => {
      await utils.admin.listStagePenalties.invalidate();
      toast.success("Red star threshold updated");
    },
  });

  const knockoutStages = stages.filter((s) => s.isKnockout);
  const current = knockoutStages.find((s) => s.isRedStarStartStage)?.id ?? "";

  return (
    <div className="rounded-xl border border-foreground/10 p-4">
      <h3 className="text-sm font-semibold">Red star eligible from</h3>
      <p className="mt-1 text-sm text-foreground/60">
        Matches in this stage and every later stage allow a red or purple star
        pick.
      </p>
      <select
        value={current}
        onChange={(e) =>
          setThreshold.mutate({ stageId: e.target.value || null })
        }
        className="mt-2 rounded-lg border border-foreground/10 bg-foreground/10 px-2 py-1 text-sm"
      >
        <option value="">None (disabled)</option>
        {knockoutStages.map((s) => (
          <option key={s.id} value={s.id} disabled={s.hasCompletedMatch}>
            {s.name}
            {s.hasCompletedMatch ? " (locked)" : ""}
          </option>
        ))}
      </select>
      {setThreshold.error && (
        <p className="mt-1 text-xs text-red-400">
          {setThreshold.error.message}
        </p>
      )}
    </div>
  );
}

export function StagePenaltiesPanel() {
  const { data: stages = [], isLoading } = api.admin.listStagePenalties.useQuery();

  if (isLoading) {
    return <p className="text-foreground/50">Loading stages...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Stage Penalties</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Wrong-prediction and no-pick beer penalties, and the Star of Hope
          budget, per stage. Correct predictions always cost {BEER_WIN} beer,
          unaffected by this table.
        </p>
      </div>

      {stages.length > 0 && <RedStarThresholdControl stages={stages} />}

      {stages.length === 0 ? (
        <p className="text-foreground/40">No stages found.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/10 text-left text-sm text-foreground/50">
              <th className="pb-2 pr-4 font-normal">Stage</th>
              <th className="pb-2 pr-4 font-normal">Wrong</th>
              <th className="pb-2 pr-4 font-normal">No pick</th>
              <th className="pb-2 pr-4 font-normal">Stars</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => (
              <StageRow key={stage.id} stage={stage} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
