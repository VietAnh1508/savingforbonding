import Link from "next/link";

import { NavMenu } from "~/app/_components/nav-client";
import { auth } from "~/server/auth";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="sticky top-0 z-50 border-b border-foreground/10 bg-white/60 backdrop-blur-sm dark:bg-black/20">
      <div className="container mx-auto flex items-center justify-between px-4 py-2 md:py-4">
        <Link href="/" className="text-base font-bold text-emerald-400 md:text-xl">
          ⚽ SavingForBonding
        </Link>
        <NavMenu
          isLoggedIn={!!session?.user}
          userName={session?.user?.name}
          userEmail={session?.user?.email}
        />
      </div>
    </nav>
  );
}
