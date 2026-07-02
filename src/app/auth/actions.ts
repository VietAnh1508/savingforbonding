"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { noBetPenaltyForStage } from "~/lib/match";
import { hashPassword } from "~/lib/password";
import { auth, signIn } from "~/server/auth";
import { db } from "~/server/db";

export async function signInWithCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/auth/signin?error=InvalidCredentials");
  }

  const userRecord = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { mustChangePassword: true },
  });
  const redirectTo = userRecord?.mustChangePassword ? "/auth/change-password" : "/";

  try {
    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/auth/signin?error=InvalidCredentials&email=${encodeURIComponent(email)}`);
    }
    throw error;
  }
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 8) {
    redirect("/auth/change-password?error=PasswordTooShort");
  }

  const passwordHash = await hashPassword(password);
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  redirect("/");
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

  const completedMatches = await db.match.findMany({
    where: { status: "COMPLETED" },
    include: { stage: true },
  });
  const noBetDebt = completedMatches.reduce(
    (sum, match) => sum + noBetPenaltyForStage(match.stage?.name ?? null),
    0,
  );

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
