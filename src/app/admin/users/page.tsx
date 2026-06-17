import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UsersPanel } from "~/app/admin/_components/users-panel";
import { auth } from "~/server/auth";
import { ADMIN_COOKIE } from "~/lib/admin";
import { HydrateClient } from "~/trpc/server";

export default async function UsersPage() {
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== "1") redirect("/admin");

  const session = await auth();

  return (
    <HydrateClient>
      <div className="space-y-6">
        <Link
          href="/admin"
          className="text-sm text-white/50 transition hover:text-white/80"
        >
          ← Back
        </Link>
        <UsersPanel currentUserId={session?.user?.id} />
      </div>
    </HydrateClient>
  );
}
