import { MatchCard } from "~/app/_components/match-card";
import { Nav } from "~/app/_components/nav";
import { formatMatchDate, toVietnamDatetimeLocal } from "~/lib/match";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  void api.match.listUpcoming.prefetch();

  const matches = await api.match.listUpcoming();

  const grouped = matches.reduce(
    (acc, match) => {
      const key = toVietnamDatetimeLocal(match.kickoffAt).slice(0, 10);
      acc[key] ??= [];
      acc[key].push(match);
      return acc;
    },
    {} as Record<string, typeof matches>,
  );

  const sortedDates = Object.keys(grouped).sort();

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <Nav />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Upcoming Matches</h1>
            <p className="mt-2 text-white/60">
              Predict World Cup outcomes — win or lose, you owe beer
            </p>
          </div>

          {matches.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-lg text-white/60">No upcoming matches found.</p>
              <p className="mt-2 text-sm text-white/40">
                Run <code className="text-emerald-400">npm run sync:fifa</code> to
                pull the World Cup schedule from FIFA, or add matches in the{" "}
                <a href="/admin" className="text-emerald-400 hover:underline">
                  admin page
                </a>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedDates.map((dateKey) => (
                <section key={dateKey}>
                  <h2 className="mb-4 text-xl font-semibold text-emerald-400">
                    {formatMatchDate(grouped[dateKey]![0]!.kickoffAt)}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {grouped[dateKey]!.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </HydrateClient>
  );
}
