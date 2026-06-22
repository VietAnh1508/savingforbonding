"use client";

import { type PropsWithChildren } from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "./spinner";

export function SubmitButton({ children }: PropsWithChildren) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
