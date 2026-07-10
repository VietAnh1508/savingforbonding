"use client";

import { UserAvatar } from "~/app/_components/user-avatar";
import {
  CHALLENGE_STATUS_BADGE_CLASSES,
  CHALLENGE_STATUS_LABELS,
  canCancel,
  canEdit,
  canRespond,
  canSubmitPick,
  challengeSettlement,
  isParticipant,
} from "~/lib/challenge";
import { formatBeers, formatMatchDateTime } from "~/lib/match";
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
    <div
      className={`rounded-xl border p-4 ${
        isMine
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-foreground/10 bg-foreground/5"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-foreground/60">
          {challenge.match.homeCountry} vs {challenge.match.awayCountry} —{" "}
          {formatMatchDateTime(challenge.match.kickoffAt)}
        </span>
        <div className="flex items-center gap-1.5">
          {isMine && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Yours
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHALLENGE_STATUS_BADGE_CLASSES[challenge.status]}`}
          >
            {CHALLENGE_STATUS_LABELS[challenge.status]}
          </span>
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
          <button
            type="button"
            disabled={isResponding}
            onClick={() => onRequestReject(challenge.id)}
            className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={isResponding}
            onClick={() => onAccept(challenge.id)}
            className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      )}

      {canCancel(challenge, currentUserId) && (
        <div className="flex gap-2">
          {canEdit(challenge, currentUserId) && (
            <button
              type="button"
              onClick={() => onRequestEdit(challenge)}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground"
            >
              Edit challenge
            </button>
          )}
          <button
            type="button"
            onClick={() => onRequestCancel(challenge.id)}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground"
          >
            Cancel challenge
          </button>
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
              <button
                key={p.id}
                type="button"
                disabled={isSubmittingPick}
                onClick={() => onSubmitPick(challenge.id, p.id)}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  myPick === p.id
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-foreground/10 text-foreground hover:bg-foreground/20"
                }`}
              >
                {nameFor(p.id)}
              </button>
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
    </div>
  );
}
