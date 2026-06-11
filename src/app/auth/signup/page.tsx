import Link from "next/link";
import { redirect } from "next/navigation";

import { signUp } from "~/app/auth/actions";
import { auth } from "~/server/auth";

const ERROR_MESSAGES: Record<string, string> = {
  InvalidInput: "Please fill in all required fields.",
  PasswordTooShort: "Password must be at least 8 characters.",
  EmailTaken: "An account with this email already exists.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-400">⚽ FootyPredict</h1>
          <p className="mt-2 text-white/60">Create your account</p>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <form action={signUp} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-white/70">
              Name <span className="text-white/40">(optional)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-white/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm text-white/70"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
