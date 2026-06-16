import Link from "next/link";

import { NavMenu } from "~/app/_components/nav-client";
import { auth } from "~/server/auth";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="relative border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-emerald-400">
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
