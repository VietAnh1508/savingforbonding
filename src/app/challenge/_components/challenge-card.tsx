"use client";

import { UserAvatar } from "~/app/_components/user-avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  CHALLENGE_STATUS_BADGE_CLASSES,
  CHALLENGE_STATUS_LABELS,
  canCancel,
  canRespond,
  canSubmitPick,
  challengeSettlement,
  isParticipant,
} from "~/lib/challenge";
import { formatDateTime } from "~/lib/datetime";
import { formatBeers } from "~/lib/match";
import { type RouterOutputs } from "~/trpc/react";

type Challenge = RouterOutputs["challenge"]["listMine"][number];

export function ChallengeCard({
  challenge,
  currentUserId,
  onAccept,
  onRequestReject,
  onRequestCancel,
  onRequestEdit,
  onSubmitPick,
  isResponding,
  isSubmittingPick,
  highlightOwn,
}: {
  challenge: Challenge;
  currentUserId: string;
  onAccept: (id: string) => void;
  onRequestReject: (id: string) => void;
  onRequestCancel: (id: string) => void;
  onRequestEdit: (challenge: Challenge) => void;
  onSubmitPick: (id: string, pickedUserId: string) => void;
  isResponding: boolean;
  isSubmittingPick: boolean;
  /** Show a "Yours" badge and highlight the card when the caller is a participant — used in the Community tab, where that isn't otherwise obvious. */
  highlightOwn?: boolean;
}) {
  const isChallenger = challenge.challengerId === currentUserId;
  const myPick = isChallenger
    ? challenge.challengerPickedWinnerId
    : challenge.opponentPickedWinnerId;
  const settlement = challengeSettlement(challenge, currentUserId);
  const isMine = !!highlightOwn && isParticipant(challenge, currentUserId);

  const nameFor = (userId: string) =>
    userId === currentUserId
      ? "You"
      : userId === challenge.challenger.id
        ? (challenge.challenger.name ?? "Anonymous")
        : (challenge.opponent.name ?? "Anonymous");

  return (
    <Card
      className={`block rounded-xl border px-4 py-4 ring-0 ${
        isMine
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-foreground/10 bg-foreground/5"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-foreground/60">
          {challenge.match.homeCountry} vs {challenge.match.awayCountry} —{" "}
          {formatDateTime(challenge.match.kickoffAt)}
        </span>
        <div className="flex items-center gap-1.5">
          {isMine && (
            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              Yours
            </Badge>
          )}
          <Badge className={CHALLENGE_STATUS_BADGE_CLASSES[challenge.status]}>
            {CHALLENGE_STATUS_LABELS[challenge.status]}
          </Badge>
        </div>
      </div>

      <p className="mb-2 flex items-center gap-1.5 font-medium">
        <UserAvatar
          name={challenge.challenger.name}
          image={challenge.challenger.image}
          size={20}
          fallbackClassName="bg-foreground/10 text-[10px] font-bold uppercase"
        />
        {nameFor(challenge.challenger.id)}
        <span className="text-foreground/40">vs</span>
        <UserAvatar
          name={challenge.opponent.name}
          image={challenge.opponent.image}
          size={20}
          fallbackClassName="bg-foreground/10 text-[10px] font-bold uppercase"
        />
        {nameFor(challenge.opponent.id)}
        <span className="ml-1 text-amber-600 dark:text-amber-400">
          {formatBeers(challenge.stakeBeers)}
        </span>
      </p>

      <p className="mb-3 text-sm text-foreground/70 italic">
        “{challenge.condition}”
      </p>

      {canRespond(challenge, currentUserId) && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={isResponding}
            onClick={() => onRequestReject(challenge.id)}
            className="h-auto rounded-lg px-4 py-2 text-sm font-medium"
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={isResponding}
            onClick={() => onAccept(challenge.id)}
            className="h-auto rounded-lg px-4 py-2 text-sm font-medium"
          >
            Accept
          </Button>
        </div>
      )}

      {canCancel(challenge, currentUserId) && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onRequestEdit(challenge)}
            className="h-auto rounded-lg px-4 py-2 text-sm text-foreground/60"
          >
            Edit challenge
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onRequestCancel(challenge.id)}
            className="h-auto rounded-lg px-4 py-2 text-sm text-foreground/60"
          >
            Cancel challenge
          </Button>
        </div>
      )}

      {canSubmitPick(challenge, currentUserId) && (
        <div>
          <p className="mb-2 text-sm text-foreground/60">
            Who won?{" "}
            {challenge.status === "CONFLICT" &&
              "(You disagreed — talk it out and resubmit)"}
          </p>
          <div className="flex gap-2">
            {[challenge.challenger, challenge.opponent].map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="ghost"
                disabled={isSubmittingPick}
                onClick={() => onSubmitPick(challenge.id, p.id)}
                className={`h-auto rounded-lg px-4 py-2 text-sm font-medium ${
                  myPick === p.id
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                }`}
              >
                {nameFor(p.id)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {settlement && (
        <p className="text-sm text-foreground/60">
          {settlement.perspective === "won" && (
            <>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                You won
              </span>{" "}
              — <span className="font-semibold">{nameFor(settlement.loserId)}</span>{" "}
              owes you {formatBeers(settlement.amount)}
            </>
          )}
          {settlement.perspective === "lost" && (
            <>
              <span className="font-semibold text-red-700 dark:text-red-300">
                You lost
              </span>{" "}
              — you owe{" "}
              <span className="font-semibold">{nameFor(settlement.winnerId)}</span>{" "}
              {formatBeers(settlement.amount)}
            </>
          )}
          {settlement.perspective === "spectating" && (
            <>
              <span className="font-semibold">{nameFor(settlement.winnerId)}</span>{" "}
              won — {nameFor(settlement.loserId)} owes{" "}
              {formatBeers(settlement.amount)}
            </>
          )}
        </p>
      )}

      {challenge.status === "ACCEPTED" && (
        <p className="text-sm text-foreground/50">
          Waiting for the match to finish.
        </p>
      )}

      {challenge.status === "REVIEW" && !canSubmitPick(challenge, currentUserId) && (
        <p className="text-sm text-foreground/50">
          You picked {myPick === currentUserId ? "yourself" : nameFor(myPick ?? "")} to win — waiting for the other player.
        </p>
      )}
    </Card>
  );
}
