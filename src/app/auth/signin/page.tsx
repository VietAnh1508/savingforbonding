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
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { error, email: prefillEmail } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-foreground/5 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-400">
            ⚽ SavingForBonding
          </h1>
          <p className="mt-2 text-foreground/60">
            Predict World Cup matches. Get it wrong — buy the beers.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/15 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {errorMessage}
          </div>
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
              defaultValue={prefillEmail ?? ""}
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

          <SubmitButton>Sign in</SubmitButton>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-foreground/50">
          <p>
            <ForgotPasswordModal />
          </p>
          <p>
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
    </div>
  );
}
