import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordInput } from "~/app/_components/password-input";
import { SubmitButton } from "~/app/_components/submit-button";
import { signUp } from "~/app/auth/actions";
import { auth } from "~/server/auth";

const ERROR_MESSAGES: Record<string, string> = {
  InvalidInput: "Please fill in all required fields.",
  PasswordTooShort: "Password must be at least 8 characters.",
  EmailTaken: "An account with this email already exists.",
  AllInRequired: 'You must check "I am all in" to create an account.',
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
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-foreground/5 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-400">
            ⚽ SavingForBonding
          </h1>
          <p className="mt-2 text-foreground/60">Create your account</p>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <form action={signUp} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-foreground/70">
              Name <span className="text-foreground/40">(optional)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="w-full rounded-xl border border-foreground/10 bg-foreground/10 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="Your name"
            />
          </div>

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
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-foreground/10 bg-foreground/10 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3">
            <input
              id="allIn"
              name="allIn"
              type="checkbox"
              value="yes"
              required
              className="mt-1 h-4 w-4 rounded border-foreground/20 bg-foreground/10 text-emerald-500 focus:ring-emerald-500/50"
            />
            <span className="text-sm text-foreground/80">I am all in</span>
          </label>

          <SubmitButton>Create account</SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/50">
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
