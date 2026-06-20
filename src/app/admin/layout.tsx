import { cookies } from "next/headers";

import type { PropsWithChildren } from "react";
import { Nav } from "~/app/_components/nav";
import { ADMIN_COOKIE } from "~/lib/admin";
import { adminLogout } from "./actions";

export default async function AdminLayout({ children }: PropsWithChildren) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get(ADMIN_COOKIE)?.value === "1";

  if (!isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Nav />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin</h1>
          <form action={adminLogout}>
            <button
              type="submit"
              className="rounded-lg border border-foreground/10 px-4 py-2 text-sm hover:bg-foreground/10"
            >
              Log out
            </button>
          </form>
        </div>
        {children}
      </main>
    </>
  );
}
