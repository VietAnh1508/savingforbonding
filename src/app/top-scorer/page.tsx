import { TopScorerVoteCard } from "~/app/_components/top-scorer/top-scorer-vote-card";
import { ChampionVotingCountdown } from "~/app/_components/champion/champion-voting-countdown";
import { Nav } from "~/app/_components/nav";
import { formatMatchDateTime } from "~/lib/match";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function TopScorerPage() {
  const session = await auth();
  const isSignedIn = !!session?.user;

  const [, votingStatus] = await Promise.all([
    api.topScorerVote.getVoteCounts.prefetch(),
    api.topScorerVote.getVotingStatus(),
    api.topScorerVote.getVotingStatus.prefetch(),
    ...(isSignedIn ? [api.topScorerVote.getMyVote.prefetch()] : []),
  ]);

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Pick the Top Scorer</h1>
        <p className="mb-1 text-foreground/60">
          Who do you think will win the Golden Boot? Pick your player below.
        </p>
        {votingStatus.isOpen && (
          <p className="mb-1 text-foreground/60">
            You can change your pick until{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              the Play-off for third place kicks off
              {votingStatus.deadline &&
                ` (${formatMatchDateTime(votingStatus.deadline)})`}
            </span>
            .
          </p>
        )}
        {votingStatus.isOpen && votingStatus.deadline && (
          <p className="mb-4 text-sm font-medium text-amber-600 dark:text-amber-400">
            <ChampionVotingCountdown deadline={votingStatus.deadline} />
          </p>
        )}
        <TopScorerVoteCard isSignedIn={isSignedIn} />
      </main>
    </HydrateClient>
  );
}
