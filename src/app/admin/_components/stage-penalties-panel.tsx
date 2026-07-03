"use client";

import { useState } from "react";

import { SubmitButton } from "~/app/_components/submit-button";
import { useToast } from "~/app/_components/toast";
import {
  BEER_WIN,
  noVotePenaltyForStage,
  validateStagePenalty,
  wrongPenaltyForStage,
} from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Stage = RouterOutputs["admin"]["listStagePenalties"][number];

function StageRow({ stage }: { stage: Stage }) {
  const utils = api.useUtils();
  const toast = useToast();

  const [wrongPenalty, setWrongPenalty] = useState(
    String(wrongPenaltyForStage(stage.penalty)),
  );
  const [noVotePenalty, setNoVotePenalty] = useState(
    String(noVotePenaltyForStage(stage.penalty)),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const updatePenalty = api.admin.updateStagePenalty.useMutation({
    onSuccess: async () => {
      await utils.admin.listStagePenalties.invalidate();
      setFormError(null);
      toast.success(`${stage.name} penalties saved`);
    },
  });

  async function handleSave() {
    const wrong = parseInt(wrongPenalty, 10);
    const noVote = parseInt(noVotePenalty, 10);

    if (Number.isNaN(wrong) || Number.isNaN(noVote)) {
      setFormError("Penalties must be valid numbers");
      return;
    }

    const error = validateStagePenalty(wrong, noVote);
    if (error) {
      setFormError(error);
      return;
    }

    setFormError(null);
    try {
      await updatePenalty.mutateAsync({
        stageId: stage.id,
        wrongPenalty: wrong,
        noVotePenalty: noVote,
      });
    } catch {
      // surfaced via updatePenalty.error below
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
          value={wrongPenalty}
          onChange={(e) => setWrongPenalty(e.target.value)}
          disabled={locked}
          className={inputClass}
        />
      </td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min="0"
          step="1"
          value={noVotePenalty}
          onChange={(e) => setNoVotePenalty(e.target.value)}
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
            {(formError ?? updatePenalty.error) && (
              <p className="mt-1 text-xs text-red-400">
                {formError ?? updatePenalty.error?.message}
              </p>
            )}
          </form>
        )}
      </td>
    </tr>
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
          Wrong-prediction and no-pick beer penalties, per stage. Correct
          predictions always cost {BEER_WIN} beer, unaffected by this table.
        </p>
      </div>

      {stages.length === 0 ? (
        <p className="text-foreground/40">No stages found.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/10 text-left text-sm text-foreground/50">
              <th className="pb-2 pr-4 font-normal">Stage</th>
              <th className="pb-2 pr-4 font-normal">Wrong</th>
              <th className="pb-2 pr-4 font-normal">No pick</th>
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
