import Image from "next/image";
import { redirect } from "next/navigation";

import { EditProfileName } from "~/app/_components/edit-profile-name";
import { Nav } from "~/app/_components/nav";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { RecentPredictions } from "./_components/recent-predictions";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const [stats, votes, missedMatches] = await Promise.all([
    api.vote.getMyStats(),
    api.vote.getMyVotes({ limit: 20 }),
    api.vote.getMyMissedMatches({ limit: 20 }),
  ]);

  const voteItems = votes.map((v) => ({
    kind: "vote" as const,
    id: v.id,
    kickoffAt: v.match.kickoffAt,
    homeCountry: v.match.homeCountry,
    awayCountry: v.match.awayCountry,
    outcome: v.outcome,
    isCorrect: v.isCorrect,
    points: v.points,
  }));

  const missedItems = missedMatches.map((m) => ({
    kind: "missed" as const,
    id: m.id,
    kickoffAt: m.kickoffAt,
    homeCountry: m.homeCountry,
    awayCountry: m.awayCountry,
  }));

  const allItems = [...voteItems, ...missedItems].sort(
    (a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime(),
  );

  return (
    <HydrateClient>
      <div className="flex h-screen flex-col bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <Nav />
        <main className="container mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-8">
          <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={64}
                height={64}
                className="h-10 w-10 rounded-full sm:h-16 sm:w-16"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-lg sm:h-16 sm:w-16 sm:text-2xl">
                {(session.user.name ?? "?")[0]}
              </div>
            )}
            <EditProfileName
              initialName={session.user.name}
              email={session.user.email}
            />
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Beers", value: `${stats.totalBeers}` },
              { label: "Weekly Beers", value: `${stats.weeklyBeers}` },
              { label: "Accuracy", value: `${stats.accuracy}%` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-center sm:min-h-24 sm:p-4"
              >
                <div className="text-xl font-bold text-white sm:text-2xl">
                  {stat.value}
                </div>
                <div className="text-xs text-white/50">{stat.label}</div>
              </div>
            ))}
            <div className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-center sm:min-h-24 sm:p-4">
              <div className="text-xl font-bold sm:text-2xl">
                <span className="text-green-400">{stats.correctVotes}</span>
                <span className="mx-1 text-white/30">/</span>
                <span className="text-red-400">{stats.incorrectVotes}</span>
                <span className="mx-1 text-white/30">/</span>
                <span className="text-yellow-300">{stats.missedVotes}</span>
              </div>
              <div className="text-xs text-white/50">Correct / Wrong / Missed</div>
            </div>
          </div>

          <RecentPredictions items={allItems} />
        </main>
      </div>
    </HydrateClient>
  );
}
