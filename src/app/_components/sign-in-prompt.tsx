export function SignInPrompt({ action }: { action: string }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-6 text-center">
      <p className="text-foreground/60">
        <a
          href="/auth/signin"
          className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Sign in
        </a>{" "}
        {action}
      </p>
    </div>
  );
}
