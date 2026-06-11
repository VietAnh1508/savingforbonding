import Image from "next/image";
import { redirect } from "next/navigation";

import { Nav } from "~/app/_components/nav";
import { outcomeShort } from "~/lib/match";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const [stats, votes] = await Promise.all([
    api.vote.getMyStats(),
    api.vote.getMyVotes({ limit: 20 }),
  ]);

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <Nav />
        <main className="container mx-auto max-w-3xl px-4 py-8">
          <div className="mb-8 flex items-center gap-4">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
                {(session.user.name ?? "?")[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {session.user.name ?? "Your Profile"}
              </h1>
              <p className="text-white/60">{session.user.email}</p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Points", value: stats.totalPoints },
              { label: "Weekly Points", value: stats.weeklyPoints },
              { label: "Accuracy", value: `${stats.accuracy}%` },
              {
                label: "Correct",
                value: `${stats.correctVotes}/${stats.totalVotes}`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
              >
                <div className="text-2xl font-bold text-emerald-400">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Recent Predictions</h2>
            {votes.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
                No predictions yet.{" "}
                <a href="/" className="text-emerald-400 hover:underline">
                  Browse matches
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {votes.map((vote) => (
                  <a
                    key={vote.id}
                    href={`/matches/${vote.match.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <div>
                      <div className="font-medium">
                        {vote.match.homeCountry} vs {vote.match.awayCountry}
                      </div>
                      <div className="text-sm text-white/50">
                        Predicted: {outcomeShort(vote.outcome)}
                      </div>
                    </div>
                    <div>
                      {vote.isCorrect === null ? (
                        <span className="text-sm text-white/40">Pending</span>
                      ) : vote.isCorrect ? (
                        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-300">
                          +{vote.points} pts
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm text-red-300">
                          Incorrect
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </HydrateClient>
  );
}
