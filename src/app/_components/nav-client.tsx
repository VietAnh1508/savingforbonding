"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "~/app/_components/theme-toggle";
import { UserMenu } from "~/app/_components/user-menu";

interface NavClientProps {
  isLoggedIn: boolean;
  userName?: string | null;
  userEmail?: string | null;
}

export function NavMenu({ isLoggedIn, userName, userEmail }: NavClientProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Matches" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/rules", label: "Rules" },
  ];

  const linkClass = (href: string) => {
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return `text-sm font-medium transition-colors ${
      isActive
        ? "text-foreground border-b-2 border-emerald-500 pb-0.5"
        : "text-foreground/60 hover:text-foreground border-b-2 border-transparent pb-0.5"
    }`;
  };

  const links = (
    <>
      {navItems.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={linkClass(href)}
          onClick={() => setOpen(false)}
        >
          {label}
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden items-center gap-4 md:flex">
        {links}
        <ThemeToggle />
        {isLoggedIn ? (
          <UserMenu name={userName} email={userEmail} />
        ) : (
          <Link
            href="/auth/signin"
            className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/30 dark:text-emerald-300"
          >
            Sign in
          </Link>
        )}
      </div>

      {/* Mobile: theme toggle → hamburger → user menu */}
      <div className="flex items-center gap-2 md:hidden">
        <ThemeToggle />
        <button
          className="flex flex-col items-center justify-center gap-1 p-1"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-5 bg-foreground transition-all duration-200 ${open ? "translate-y-1.5 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-foreground transition-all duration-200 ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-foreground transition-all duration-200 ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
          />
        </button>
        {isLoggedIn ? (
          <UserMenu name={userName} email={userEmail} />
        ) : (
          <Link
            href="/auth/signin"
            className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/30 dark:text-emerald-300"
            onClick={() => setOpen(false)}
          >
            Sign in
          </Link>
        )}
      </div>

      {/* Mobile dropdown — nav links only */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-200 flex flex-col gap-4 border-b border-foreground/10 bg-white/95 px-6 py-5 backdrop-blur-sm dark:bg-black/90 md:hidden">
          {links}
        </div>
      )}
    </>
  );
}
