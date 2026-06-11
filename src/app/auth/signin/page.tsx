import { redirect } from "next/navigation";

import { auth, signIn } from "~/server/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/");

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-400">⚽ FootyPredict</h1>
          <p className="mt-2 text-white/60">
            Sign in to predict match outcomes and compete on the leaderboard
          </p>
        </div>

        <div className="space-y-3">
          {isDev && (
            <form
              action={async () => {
                "use server";
                await signIn("dev", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
              >
                Continue as Dev User
              </button>
              <p className="mt-2 text-center text-xs text-white/40">
                Local dev only — no Google/Discord setup needed
              </p>
            </form>
          )}

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/20"
            >
              Continue with Google
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("discord", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#5865F2]/20 px-4 py-3 font-semibold transition hover:bg-[#5865F2]/30"
            >
              Continue with Discord
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
