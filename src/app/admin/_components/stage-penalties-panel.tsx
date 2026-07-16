"use client";

import { useState } from "react";

import { SubmitButton } from "~/app/_components/submit-button";
import { STAR_TIER_INFO } from "~/app/_components/star-tiers";
import { useToast } from "~/app/_components/toast";
import {
  BEER_WIN,
  noVotePenaltyForStage,
  STAR_TIER_MULTIPLIERS,
  validateMaxStarMultiplier,
  validateStagePenalty,
  validateStageStars,
  wrongPenaltyForStage,
} from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Stage = RouterOutputs["admin"]["listStagePenalties"][number];

function MaxMultiplierSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={className}
    >
      <option value={0}>Disabled</option>
      {STAR_TIER_MULTIPLIERS.map((tier) => (
        <option key={tier} value={tier}>
          {STAR_TIER_INFO[tier].name} (×{tier})
        </option>
      ))}
    </select>
  );
}

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
  const [maxStarMultiplier, setMaxStarMultiplier] = useState(
    stage.maxStarMultiplier,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const updatePenalty = api.admin.updateStagePenalty.useMutation();
  const updateStars = api.admin.updateStageStars.useMutation();
  const updateMaxMultiplier = api.admin.updateStageMaxMultiplier.useMutation();

  async function handleSave() {
    if (
      Number.isNaN(wrongPenalty) ||
      Number.isNaN(noVotePenalty) ||
      Number.isNaN(starsAllocated) ||
      Number.isNaN(maxStarMultiplier)
    ) {
      setFormError("Values must be valid numbers");
      return;
    }

    const penaltyError = validateStagePenalty(wrongPenalty, noVotePenalty);
    const starsError = validateStageStars(starsAllocated);
    const maxMultiplierError = validateMaxStarMultiplier(maxStarMultiplier);
    const error = penaltyError ?? starsError ?? maxMultiplierError;
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
        updateMaxMultiplier.mutateAsync({
          stageId: stage.id,
          maxStarMultiplier,
        }),
      ]);
      await utils.admin.listStagePenalties.invalidate();
      toast.success(`${stage.name} settings saved`);
    } catch {
      // surfaced via updatePenalty.error/updateStars.error/updateMaxMultiplier.error below
    }
  }

  const locked = stage.hasCompletedMatch;
  const inputClass =
    "w-20 rounded-lg border border-foreground/10 bg-foreground/10 px-2 py-1 text-sm disabled:opacity-50";
  const selectClass =
    "w-32 rounded-lg border border-foreground/10 bg-foreground/10 px-2 py-1 text-sm disabled:opacity-50";

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
      <td className="py-2 pr-4">
        <MaxMultiplierSelect
          value={maxStarMultiplier}
          onChange={setMaxStarMultiplier}
          disabled={locked}
          className={selectClass}
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
            {(formError ??
              updatePenalty.error ??
              updateStars.error ??
              updateMaxMultiplier.error) && (
              <p className="mt-1 text-xs text-red-400">
                {formError ??
                  updatePenalty.error?.message ??
                  updateStars.error?.message ??
                  updateMaxMultiplier.error?.message}
              </p>
            )}
          </form>
        )}
      </td>
    </tr>
  );
}

function ChampionMaxMultiplierControl() {
  const utils = api.useUtils();
  const toast = useToast();
  const { data: settings } = api.admin.getGameSettings.useQuery();
  const [value, setValue] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const updateChampionMax = api.admin.updateChampionMaxMultiplier.useMutation({
    onSuccess: async () => {
      await utils.admin.getGameSettings.invalidate();
      toast.success("Champion max multiplier updated");
    },
  });

  const displayValue = value ?? settings?.championMaxStarMultiplier ?? 0;

  async function handleSave() {
    if (Number.isNaN(displayValue)) {
      setFormError("Value must be a valid number");
      return;
    }
    const error = validateMaxStarMultiplier(displayValue);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    try {
      await updateChampionMax.mutateAsync({
        championMaxStarMultiplier: displayValue,
      });
    } catch {
      // surfaced via updateChampionMax.error below
    }
  }

  return (
    <div className="rounded-xl border border-foreground/10 p-4">
      <h3 className="text-sm font-semibold">Champion vote max multiplier</h3>
      <p className="mt-1 text-sm text-foreground/60">
        Highest stake a player can choose when starring their champion pick.
      </p>
      <form
        action={handleSave}
        className="mt-2 flex items-center gap-2"
      >
        <MaxMultiplierSelect
          value={displayValue}
          onChange={setValue}
          className="rounded-lg border border-foreground/10 bg-foreground/10 px-2 py-1 text-sm"
        />
        <SubmitButton size="sm">Save</SubmitButton>
      </form>
      {(formError ?? updateChampionMax.error) && (
        <p className="mt-1 text-xs text-red-400">
          {formError ?? updateChampionMax.error?.message}
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
          Wrong-prediction and no-pick beer penalties, the Star of Hope
          budget, and the highest multiplier a player can choose, per stage.
          Correct predictions always cost {BEER_WIN} beer, unaffected by this
          table.
        </p>
      </div>

      <ChampionMaxMultiplierControl />

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
              <th className="pb-2 pr-4 font-normal">Star tier</th>
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
