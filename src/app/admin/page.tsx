import { cookies } from "next/headers";
import Link from "next/link";

import { adminLogin } from "~/app/admin/actions";
import { FifaSyncBanner } from "~/app/admin/_components/fifa-sync-banner";
import { ADMIN_COOKIE } from "~/lib/admin";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  const { error } = await searchParams;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="mb-2 text-2xl font-bold">Admin Login</h1>
          <p className="mb-6 text-sm text-white/60">
            Manage World Cup matches and beer odds ratios
          </p>
          {error && (
            <p className="mb-4 text-sm text-red-400">Incorrect password</p>
          )}
          <form action={adminLogin} className="space-y-4">
            <input
              name="password"
              type="password"
              required
              placeholder="Admin password"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400"
            >
              Sign in
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-white/40">
            Set <code>ADMIN_PASSWORD</code> in your <code>.env</code> file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FifaSyncBanner />
      <Link
        href="/admin/matches"
        className="block rounded-xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
      >
        <h2 className="font-semibold text-white">Match Management</h2>
        <p className="mt-1 text-sm text-white/60">
          Add, edit, and complete matches.
        </p>
      </Link>
    </div>
  );
}
