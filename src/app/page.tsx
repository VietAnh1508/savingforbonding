import { MatchTabs } from "~/app/_components/match-tabs";
import { Nav } from "~/app/_components/nav";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  void api.match.listUpcoming.prefetch();

  const [matches, session] = await Promise.all([
    api.match.listUpcoming(),
    auth(),
  ]);

  const upcoming = matches.filter((m) =>
    ["SCHEDULED", "LIVE", "POSTPONED"].includes(m.status),
  );
  const completed = matches.filter((m) => m.status === "COMPLETED");

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <Nav />
        <main className="container mx-auto px-4 py-8">
          {matches.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <p className="text-lg text-white/60">No matches found.</p>
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
            <MatchTabs upcoming={upcoming} completed={completed} isSignedIn={!!session?.user} />
          )}
        </main>
      </div>
    </HydrateClient>
  );
}
