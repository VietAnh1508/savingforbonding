"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function BackLink({ href, label = "Back" }: { href?: string; label?: string }) {
  const router = useRouter();

  if (!href) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-foreground/50 transition hover:text-foreground/80"
      >
        ← {label}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="text-sm text-foreground/50 transition hover:text-foreground/80"
    >
      ← {label}
    </Link>
  );
}
