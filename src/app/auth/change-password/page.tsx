import { redirect } from "next/navigation";

import { SubmitButton } from "~/app/_components/submit-button";
import { changePassword } from "~/app/auth/actions";
import { auth } from "~/server/auth";

const ERROR_MESSAGES: Record<string, string> = {
  PasswordTooShort: "Password must be at least 8 characters.",
};

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-foreground/5 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-emerald-400">Set a new password</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Your password was reset by an admin. Choose a new one to continue.
          </p>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <form action={changePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-foreground/70">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-foreground/10 bg-foreground/10 px-4 py-3 text-foreground placeholder:text-foreground/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>

          <SubmitButton>Set new password</SubmitButton>
        </form>
      </div>
    </div>
  );
}
