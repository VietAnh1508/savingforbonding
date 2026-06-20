import Link from "next/link";
import { redirect } from "next/navigation";

import { ForgotPasswordModal } from "~/app/_components/forgot-password-modal";
import { PasswordInput } from "~/app/_components/password-input";
import { SubmitButton } from "~/app/_components/submit-button";
import { signInWithCredentials } from "~/app/auth/actions";
import { auth } from "~/server/auth";

const ERROR_MESSAGES: Record<string, string> = {
  InvalidCredentials: "Invalid email or password.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-foreground/5 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-400">
            ⚽ SavingForBonding
          </h1>
          <p className="mt-2 text-foreground/60">
            Sign in with your email and password
          </p>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <form action={signInWithCredentials} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-foreground/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-foreground/10 bg-foreground/10 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm text-foreground/70"
            >
              Password
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-foreground/10 bg-foreground/10 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="Your password"
            />
          </div>

          <div className="flex justify-end">
            <ForgotPasswordModal />
          </div>

          <SubmitButton>Sign in</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/50">
          No account yet?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
