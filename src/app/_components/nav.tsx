import Link from "next/link";

import { UserMenu } from "~/app/_components/user-menu";
import { auth } from "~/server/auth";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-emerald-400">
          ⚽ SavingForBonding
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Matches
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Top Donator
          </Link>
          <Link
            href="/rules"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Rules
          </Link>
          {session?.user && (
            <Link
              href="/profile"
              className="text-sm font-medium text-white/80 transition hover:text-white"
            >
              Profile
            </Link>
          )}
          {session?.user ? (
            <UserMenu name={session.user.name} email={session.user.email} />
          ) : (
            <Link
              href="/auth/signin"
              className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

