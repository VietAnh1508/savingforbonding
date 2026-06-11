"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_COOKIE } from "~/lib/admin";
import { env } from "~/env";

export async function adminLogin(formData: FormData) {
  const password = formData.get("password");

  if (
    !env.ADMIN_PASSWORD ||
    typeof password !== "string" ||
    password !== env.ADMIN_PASSWORD
  ) {
    redirect("/admin?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/admin");
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin");
}
