import { notFound } from "next/navigation";

import { BackLink } from "~/app/admin/_components/back-link";
import { BeerStakes } from "~/app/_components/beer-stakes";
import { BettingRatios } from "~/app/_components/betting-ratios";
import { MatchStatusBadge } from "~/app/_components/match-status-badge";
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
      <Nav />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <BackLink href="/" />
        </div>
        <div className="mb-2 text-sm text-foreground/50">{match.tournament}</div>

        <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-8">
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
                <span className="text-2xl font-bold text-foreground/40">vs</span>
              )}
              <time
                dateTime={match.kickoffAt.toISOString()}
                className="text-sm text-foreground/50"
              >
                {formatMatchDateTime(match.kickoffAt)}
              </time>
              <MatchStatusBadge status={match.status} />
            </div>

            <div className="flex flex-1 flex-col items-center gap-3 text-center">
              <TeamFlag country={match.awayCountry} size="md" />
              <h2 className="text-lg font-bold">{match.awayCountry}</h2>
            </div>
          </div>

          <div className="mt-6 border-t border-foreground/10 pt-6">
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
            <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6 text-center">
              <p className="text-foreground/60">
                <a
                  href="/auth/signin"
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Sign in
                </a>{" "}
                to cast your prediction
              </p>
            </div>
          )}
        </div>
      </main>
    </HydrateClient>
  );
}
