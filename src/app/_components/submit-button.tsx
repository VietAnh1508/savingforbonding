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
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3 font-semibold text-emerald-300 transition hover:cursor-grab hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
