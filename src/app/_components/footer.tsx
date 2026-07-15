"use client";

import { GithubIcon } from "~/app/_components/icons/github-icon";

export function Footer({ onOpenTerms }: { onOpenTerms: () => void }) {
  return (
    <footer className="min-h-[80px] border-t border-foreground/10 px-4 py-3 text-xs text-foreground/50">
      <div className="container mx-auto flex h-full min-h-[56px] flex-col items-center justify-center gap-2 sm:flex-row sm:justify-between">
        <span>&copy; {new Date().getFullYear()} SavingForBonding</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenTerms}
            className="cursor-pointer transition hover:text-foreground"
          >
            Terms & Conditions
          </button>
          <a
            href="https://github.com/VietAnh1508/savingforbonding"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition hover:text-foreground"
          >
            <GithubIcon className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
