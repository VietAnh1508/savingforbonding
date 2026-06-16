import { notFound } from "next/navigation";

import { BeerStakes } from "~/app/_components/beer-stakes";
import { BettingRatios } from "~/app/_components/betting-ratios";
import { MatchVoteCounts } from "~/app/_components/match-vote-counts";
import { Nav } from "~/app/_components/nav";
import { TeamFlag } from "~/app/_components/team-flag";
import { VoteForm } from "~/app/_components/vote-form";
import { formatMatchDateTime } from "~/lib/match";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const match = await api.match.getById({ id });

  if (!match) notFound();

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <Nav />
        <main className="container mx-auto max-w-2xl px-4 py-8">
          <div className="mb-2 text-sm text-white/50">{match.tournament}</div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-8">
            <div className="flex items-center justify-between gap-6">
              <div className="flex flex-1 flex-col items-center gap-3 text-center">
                <TeamFlag country={match.homeCountry} size="md" />
                <h2 className="text-lg font-bold">{match.homeCountry}</h2>
              </div>

              <div className="flex flex-col items-center gap-2">
                {match.homeScore !== null && match.awayScore !== null ? (
                  <span className="text-4xl font-bold">
                    {match.homeScore} - {match.awayScore}
                  </span>
                ) : (
                  <span className="text-2xl font-bold text-white/40">vs</span>
                )}
                <time
                  dateTime={match.kickoffAt.toISOString()}
                  className="text-sm text-white/50"
                >
                  {formatMatchDateTime(match.kickoffAt)}
                </time>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    match.status === "LIVE"
                      ? "bg-red-500/20 text-red-300"
                      : match.status === "COMPLETED"
                        ? "bg-gray-500/20 text-gray-300"
                        : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {match.status}
                </span>
              </div>

              <div className="flex flex-1 flex-col items-center gap-3 text-center">
                <TeamFlag country={match.awayCountry} size="md" />
                <h2 className="text-lg font-bold">{match.awayCountry}</h2>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <MatchVoteCounts
                homeCountry={match.homeCountry}
                awayCountry={match.awayCountry}
                voteCounts={match.voteCounts}
              />
            </div>
          </div>

          <div className="mt-8 space-y-8">
            <BeerStakes />

            <BettingRatios
              homeCountry={match.homeCountry}
              awayCountry={match.awayCountry}
              homeRatio={match.homeRatio}
              awayRatio={match.awayRatio}
            />

            {session?.user ? (
              <VoteForm
                matchId={match.id}
                homeCountry={match.homeCountry}
                awayCountry={match.awayCountry}
                initialMatch={match}
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-white/60">
                  <a
                    href="/auth/signin"
                    className="font-semibold text-emerald-400 hover:underline"
                  >
                    Sign in
                  </a>{" "}
                  to cast your prediction
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </HydrateClient>
  );
}

