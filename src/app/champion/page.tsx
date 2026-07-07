import { ChampionVoteCard } from "~/app/_components/champion/champion-vote-card";
import { Nav } from "~/app/_components/nav";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function ChampionPage() {
  const session = await auth();
  const isSignedIn = !!session?.user;

  await Promise.all([
    api.championVote.getVoteCounts.prefetch(),
    api.championVote.getVotingStatus.prefetch(),
    ...(isSignedIn ? [api.championVote.getMyVote.prefetch()] : []),
  ]);

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Pick the Champion</h1>
        <p className="mb-4 text-foreground/60">
          Who do you think will win it all? Pick from the Quarter-Final
          teams below — you can change your pick until the first
          Quarter-Final match kicks off.
        </p>
        <div className="mb-8 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-foreground/70">
          The beer stakes for this pick haven&apos;t been decided yet — stay
          tuned, the rules are coming soon. You can still cast your vote in
          the meantime.
        </div>
        <ChampionVoteCard isSignedIn={isSignedIn} />
      </main>
    </HydrateClient>
  );
}
