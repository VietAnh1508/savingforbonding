import { redirect } from "next/navigation";

import { Nav } from "~/app/_components/nav";
import { UserAvatar } from "~/app/_components/user-avatar";
import { EditAvatar } from "~/app/profile/_components/edit-avatar";
import { EditProfileName } from "~/app/profile/_components/edit-profile-name";
import { noVotePenaltyForStage } from "~/lib/match";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { RecentPredictions } from "./_components/recent-predictions";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const [stats, votes, missedMatches, followers, nameUpdatedAt, championVote] =
    await Promise.all([
      api.vote.getMyStats(),
      api.vote.getMyVotes(),
      api.vote.getMyMissedMatches(),
      api.vote.getMyFollowers(),
      api.user.getNameUpdatedAt(),
      api.championVote.getMyVote(),
    ]);

  const voteItems = votes.map((v) => ({
    kind: "vote" as const,
    id: v.id,
    kickoffAt: v.match.kickoffAt,
    homeCountry: v.match.homeCountry,
    awayCountry: v.match.awayCountry,
    homeScore: v.match.homeScore,
    awayScore: v.match.awayScore,
    homePenaltyScore: v.match.homePenaltyScore,
    awayPenaltyScore: v.match.awayPenaltyScore,
    homeRatio: v.match.homeRatio,
    awayRatio: v.match.awayRatio,
    outcome: v.outcome,
    isCorrect: v.isCorrect,
    points: v.points,
    starTier: v.starTier,
  }));

  const missedItems = missedMatches.map((m) => ({
    kind: "missed" as const,
    id: m.id,
    kickoffAt: m.kickoffAt,
    homeCountry: m.homeCountry,
    awayCountry: m.awayCountry,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenaltyScore: m.homePenaltyScore,
    awayPenaltyScore: m.awayPenaltyScore,
    homeRatio: m.homeRatio,
    awayRatio: m.awayRatio,
    noVotePenalty: noVotePenaltyForStage(m.stage?.penalty),
  }));

  // Chronological (oldest first) so the running beer total below reads like a
  // ledger — each row's total is the balance right after that match settled.
  const chronological = [...voteItems, ...missedItems].sort(
    (a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime(),
  );

  let runningTotal = 0;
  const allItems = chronological.map((item) => {
    if (item.kind === "missed") {
      runningTotal += item.noVotePenalty;
      return { ...item, points: item.noVotePenalty, runningTotal };
    }
    if (item.isCorrect !== null) {
      runningTotal = Math.max(0, runningTotal + item.points);
    }
    return { ...item, runningTotal };
  });

  const championResolved = championVote != null && championVote.isCorrect !== null;
  const championPoints = championVote?.points ?? 0;

  return (
    <HydrateClient>
      <div className="flex h-screen flex-col">
        <Nav />
        <main className="container mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4">
          <div className="mb-4 flex items-center gap-3">
            <EditAvatar image={session.user.image} name={session.user.name} />
            <EditProfileName
              initialName={session.user.name}
              email={session.user.email}
              nameUpdatedAt={nameUpdatedAt}
            />
          </div>

          <div
            className={`mb-4 grid grid-cols-2 gap-3 ${
              championResolved ? "sm:grid-cols-4" : "sm:grid-cols-3"
            }`}
          >
            {[
              { label: "Total Beers", value: `${stats.totalBeers}` },
              { label: "Accuracy", value: `${stats.accuracy}%` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 p-2.5 text-center sm:min-h-16 sm:p-3"
              >
                <div className="text-xl font-bold sm:text-2xl">
                  {stat.value}
                </div>
                <div className="text-xs text-foreground/50">{stat.label}</div>
              </div>
            ))}
            {championResolved && (
              <div className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 p-2.5 text-center sm:min-h-16 sm:p-3">
                <div
                  className={`text-xl font-bold sm:text-2xl ${
                    championPoints > 0
                      ? "text-red-700 dark:text-red-300"
                      : championPoints < 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : ""
                  }`}
                >
                  {championPoints > 0 ? `+${championPoints}` : championPoints}
                </div>
                <div className="text-xs text-foreground/50">
                  Champion Vote
                </div>
              </div>
            )}
            <div className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 p-2.5 text-center sm:min-h-16 sm:p-3">
              <div className="text-xl font-bold sm:text-2xl">
                <span className="text-green-400">{stats.correctVotes}</span>
                <span className="mx-1 text-foreground/30">/</span>
                <span className="text-red-400">{stats.incorrectVotes}</span>
                <span className="mx-1 text-foreground/30">/</span>
                <span className="text-yellow-300">{stats.missedVotes}</span>
              </div>
              <div className="text-xs text-foreground/50">
                Correct / Wrong / Missed
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Followers
            </h2>
            {followers.length === 0 ? (
              <p className="text-sm text-foreground/40">
                Nobody is following you yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {followers.map(({ follower }) => (
                  <div
                    key={follower.id}
                    className="flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1.5"
                  >
                    <UserAvatar
                      name={follower.name}
                      image={follower.image}
                      size={20}
                      fallbackClassName="bg-emerald-500/20 text-xs"
                    />
                    <span className="text-sm">
                      {follower.name ?? "Anonymous"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <RecentPredictions items={allItems} />
        </main>
      </div>
    </HydrateClient>
  );
}
