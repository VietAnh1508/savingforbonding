"use client";

import Link from "next/link";

import { ChampionVotingCountdown } from "~/app/_components/champion/champion-voting-countdown";
import { formatMatchDateTime } from "~/lib/match";
import { api } from "~/trpc/react";

export function ChampionVotingBanner({
  isSignedIn,
}: {
  isSignedIn: boolean;
}) {
  const { data: votingStatus } = api.championVote.getVotingStatus.useQuery();
  const { data: myVote } = api.championVote.getMyVote.useQuery(undefined, {
    enabled: isSignedIn,
  });

  if (!votingStatus?.isOpen || !votingStatus.deadline) return null;
  if (isSignedIn && myVote?.candidateId) return null;

  return (
    <div className="mt-6 mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
      <p className="font-semibold">
        🏆 Champion voting closes{" "}
        {formatMatchDateTime(votingStatus.deadline)} —{" "}
        <ChampionVotingCountdown deadline={votingStatus.deadline} />
      </p>
      <p className="mt-1 text-amber-700/80 dark:text-amber-300/80">
        You haven&apos;t picked a champion yet.{" "}
        <Link href="/champion" className="font-medium underline">
          Cast your vote
        </Link>{" "}
        before the deadline.
      </p>
    </div>
  );
}
