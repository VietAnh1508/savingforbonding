"use client";

import Link from "next/link";
import { useState } from "react";

import { UserMenu } from "~/app/_components/user-menu";

interface NavClientProps {
  isLoggedIn: boolean;
  userName?: string | null;
  userEmail?: string | null;
}

export function NavMenu({ isLoggedIn, userName, userEmail }: NavClientProps) {
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <Link
        href="/"
        className="text-sm font-medium text-white/80 transition-colors hover:text-white"
        onClick={() => setOpen(false)}
      >
        Matches
      </Link>
      <Link
        href="/leaderboard"
        className="text-sm font-medium text-white/80 transition-colors hover:text-white"
        onClick={() => setOpen(false)}
      >
        Top Donator
      </Link>
      <Link
        href="/rules"
        className="text-sm font-medium text-white/80 transition-colors hover:text-white"
        onClick={() => setOpen(false)}
      >
        Rules
      </Link>
    </>
  );

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden items-center gap-6 md:flex">
        {links}
        {isLoggedIn ? (
          <UserMenu name={userName} email={userEmail} />
        ) : (
          <Link
            href="/auth/signin"
            className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
          >
            Sign in
          </Link>
        )}
      </div>

      {/* Mobile hamburger button */}
      <button
        className="flex flex-col items-center justify-center gap-1.5 p-1 md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        <span
          className={`block h-0.5 w-6 bg-white transition-all duration-200 ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 bg-white transition-all duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 bg-white transition-all duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 flex flex-col gap-4 border-b border-white/10 bg-black/90 px-6 py-5 backdrop-blur-sm md:hidden">
          {links}
          {isLoggedIn ? (
            <UserMenu name={userName} email={userEmail} />
          ) : (
            <Link
              href="/auth/signin"
              className="w-fit rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/30"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </>
  );
}
