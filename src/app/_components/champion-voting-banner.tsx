"use client";

import Link from "next/link";

import { ChampionVotingCountdown } from "~/app/_components/champion/champion-voting-countdown";
import {
  CHAMPION_VOTE_BONUS,
  formatMatchDateTime,
  starMultiplier,
} from "~/lib/match";
import { api } from "~/trpc/react";

const MAX_CHAMPION_VOTE_BONUS = CHAMPION_VOTE_BONUS * starMultiplier("RED");

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
        A chance to clear {CHAMPION_VOTE_BONUS}-{MAX_CHAMPION_VOTE_BONUS}{" "}
        beers —{" "}
        <Link href="/champion" className="font-medium underline">
          cast your vote
        </Link>{" "}
        now.
      </p>
    </div>
  );
}
