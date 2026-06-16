"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { BEER_NO_BET } from "~/lib/match";
import { hashPassword } from "~/lib/password";
import { signIn } from "~/server/auth";
import { db } from "~/server/db";

export async function signInWithCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/auth/signin?error=InvalidCredentials");
  }

  try {
    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/auth/signin?error=InvalidCredentials");
    }
    throw error;
  }
}

export async function signUp(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");
  const allIn = formData.get("allIn");

  if (allIn !== "yes") {
    redirect("/auth/signup?error=AllInRequired");
  }

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    redirect("/auth/signup?error=InvalidInput");
  }

  if (password.length < 8) {
    redirect("/auth/signup?error=PasswordTooShort");
  }

  const normalizedEmail = email.toLowerCase();

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    redirect("/auth/signup?error=EmailTaken");
  }

  const passwordHash = await hashPassword(password);

  const completedMatchCount = await db.match.count({
    where: { status: "COMPLETED" },
  });
  const noBetDebt = completedMatchCount * BEER_NO_BET;

  await db.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: typeof name === "string" && name.trim() ? name.trim() : null,
      createdAt: new Date(),
      totalPoints: noBetDebt,
      weeklyPoints: noBetDebt,
    },
  });

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/auth/signin?error=InvalidCredentials");
    }
    throw error;
  }
}
