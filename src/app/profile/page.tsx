import Image from "next/image";
import { redirect } from "next/navigation";

import { EditProfileName } from "~/app/_components/edit-profile-name";
import { Nav } from "~/app/_components/nav";
import { type VoteOutcome } from "../../../generated/prisma";
import { BEER_NO_BET, formatBeers, outcomeShort } from "~/lib/match";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const [stats, votes, missedMatches] = await Promise.all([
    api.vote.getMyStats(),
    api.vote.getMyVotes({ limit: 20 }),
    api.vote.getMyMissedMatches({ limit: 20 }),
  ]);

  type VoteItem =
    | { kind: "vote"; id: string; kickoffAt: Date; homeCountry: string; awayCountry: string; outcome: VoteOutcome; isCorrect: boolean | null; points: number }
    | { kind: "missed"; id: string; kickoffAt: Date; homeCountry: string; awayCountry: string };

  const voteItems: VoteItem[] = votes.map((v) => ({
    kind: "vote" as const,
    id: v.id,
    kickoffAt: v.match.kickoffAt,
    homeCountry: v.match.homeCountry,
    awayCountry: v.match.awayCountry,
    outcome: v.outcome,
    isCorrect: v.isCorrect,
    points: v.points,
  }));

  const missedItems: VoteItem[] = missedMatches.map((m) => ({
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
            <EditProfileName
              initialName={session.user.name}
              email={session.user.email}
            />
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Beers", value: `🍺 ${stats.totalBeers}` },
              { label: "Weekly Beers", value: `🍺 ${stats.weeklyBeers}` },
              { label: "Accuracy", value: `${stats.accuracy}%` },
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
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-bold">
                <span className="text-green-400">{stats.correctVotes}</span>
                <span className="mx-1 text-white/30">/</span>
                <span className="text-red-400">{stats.incorrectVotes}</span>
                <span className="mx-1 text-white/30">/</span>
                <span className="text-yellow-300">{stats.missedVotes}</span>
              </div>
              <div className="mt-1 text-xs text-white/50">Correct / Wrong / Missed</div>
            </div>
          </div>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Recent Predictions</h2>
            {allItems.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
                No predictions yet.{" "}
                <a href="/" className="text-emerald-400 hover:underline">
                  Browse matches
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {allItems.map((item) => (
                  <a
                    key={`${item.kind}-${item.id}`}
                    href={`/matches/${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <div>
                      <div className="font-medium">
                        {item.homeCountry} vs {item.awayCountry}
                      </div>
                      <div className="text-sm text-white/50">
                        {item.kind === "vote"
                          ? `Predicted: ${outcomeShort(item.outcome)}`
                          : "No prediction"}
                      </div>
                    </div>
                    <div>
                      {item.kind === "missed" ? (
                        <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-300">
                          🍺 {formatBeers(BEER_NO_BET)}
                        </span>
                      ) : item.isCorrect === null ? (
                        <span className="text-sm text-white/40">Pending</span>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-1 text-sm ${
                            item.isCorrect
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          🍺 {formatBeers(item.points)}
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
