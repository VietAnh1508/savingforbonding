import Link from "next/link";

import { auth } from "~/server/auth";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-emerald-400">
          ⚽ FootyPredict
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
            Leaderboard
          </Link>
          <Link
            href="/admin"
            className="text-sm font-medium text-white/80 transition hover:text-white"
          >
            Admin
          </Link>
          {session?.user && (
            <Link
              href="/profile"
              className="text-sm font-medium text-white/80 transition hover:text-white"
            >
              Profile
            </Link>
          )}
          <Link
            href={session ? "/api/auth/signout" : "/auth/signin"}
            className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
          >
            {session ? "Sign out" : "Sign in"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
