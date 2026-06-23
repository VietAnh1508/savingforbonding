"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "~/app/_components/theme-toggle";

interface NavClientProps {
  isLoggedIn: boolean;
  userName?: string | null;
  userEmail?: string | null;
}

export function NavMenu({ isLoggedIn, userName, userEmail }: NavClientProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = userName?.trim() || userEmail?.split("@")[0] || "Account";

  const navItems = [
    { href: "/", label: "Matches" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/rules", label: "Rules" },
  ];

  const desktopLinkClass = (href: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    return `text-sm font-medium transition-colors border-b-2 pb-0.5 ${
      isActive
        ? "text-foreground border-emerald-500"
        : "text-foreground/60 hover:text-foreground border-transparent"
    }`;
  };

  const dropdownLinkClass = (href: string) => {
    const isActive =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    return `block px-4 py-2.5 text-sm transition-colors hover:bg-foreground/5 ${
      isActive ? "font-semibold text-foreground" : "text-foreground/70"
    }`;
  };

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="flex items-center gap-4">
      {/* Desktop inline nav links */}
      <div className="hidden items-center gap-4 md:flex">
        {navItems.map(({ href, label }) => (
          <Link key={href} href={href} className={desktopLinkClass(href)}>
            {label}
          </Link>
        ))}
      </div>

    <div ref={menuRef} className="relative">
      {isLoggedIn ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Account menu"
          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/30 dark:text-emerald-300"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/30 text-xs font-bold uppercase">
            {displayName[0]}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="flex h-10 flex-col items-center justify-center gap-1 rounded-md p-2 transition hover:bg-foreground/5"
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
      )}

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-foreground/10 bg-card shadow-xl"
        >
          {isLoggedIn && (
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block border-b border-foreground/10 px-4 py-3 transition-colors hover:bg-foreground/10"
            >
              <p className="truncate text-sm font-medium">{displayName}</p>
              {userEmail && (
                <p className="truncate text-xs text-foreground/50">
                  {userEmail}
                </p>
              )}
            </Link>
          )}

          <div className="md:hidden">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className={dropdownLinkClass(href)}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="border-t border-foreground/10 flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-foreground/70">Theme</span>
            <ThemeToggle />
          </div>

          <a
            href="https://github.com/VietAnh1508/savingforbonding/issues"
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block  px-4 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-foreground/5"
          >
            Give feedback
          </a>

          {isLoggedIn ? (
            <>
              <Link
                href="/api/auth/signout"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block border-t border-foreground/10 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-foreground/5 hover:text-red-400"
              >
                Sign out
              </Link>
            </>
          ) : (
            <Link
              href="/auth/signin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block border-t border-foreground/10 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-foreground/10 dark:text-emerald-300"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

