import { ChampionVoteCard } from "~/app/_components/champion/champion-vote-card";
import { Nav } from "~/app/_components/nav";
import { api, HydrateClient } from "~/trpc/server";

export default async function ChampionPage() {
  await Promise.all([
    api.championVote.getVoteCounts.prefetch(),
    api.championVote.getMyVote.prefetch(),
    api.championVote.getVotingStatus.prefetch(),
  ]);

  return (
    <HydrateClient>
      <Nav />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Pick the Champion</h1>
        <p className="mb-8 text-foreground/60">
          Who do you think will win it all? Pick from the Quarter-Final
          teams below — you can change your pick until the first
          Quarter-Final match kicks off.
        </p>
        <ChampionVoteCard />
      </main>
    </HydrateClient>
  );
}
