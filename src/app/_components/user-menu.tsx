"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function UserMenu({
  name,
  email,
}: {
  name: string | null | undefined;
  email: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName =
    name?.trim() || email?.split("@")[0] || "Account";

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex cursor-pointer items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-500/30"
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

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-foreground/10 bg-card shadow-xl"
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block border-b border-foreground/10 px-4 py-3 transition-colors hover:bg-foreground/10"
          >
            <p className="truncate text-sm font-medium">
              {displayName}
            </p>
            {email && (
              <p className="truncate text-xs text-foreground/50">{email}</p>
            )}
          </Link>
          <a
            href="https://github.com/VietAnh1508/savingforbonding/issues"
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block border-b border-foreground/10 px-4 py-3 text-sm transition-colors hover:bg-foreground/10"
          >
            Give feedback
          </a>
          <Link
            href="/api/auth/signout"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-red-500 transition-colors hover:bg-foreground/10 hover:text-red-400"
          >
            Sign out
          </Link>
        </div>
      )}
    </div>
  );
}
