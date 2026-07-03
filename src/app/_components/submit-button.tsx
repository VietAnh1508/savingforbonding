"use client";

import { type PropsWithChildren } from "react";
import { useFormStatus } from "react-dom";

import { SpinnerIcon } from "./icons/spinner-icon";

const SIZE_CLASSES = {
  md: "rounded-xl px-4 py-3",
  sm: "rounded-lg px-3 py-1.5 text-sm",
} as const;

type Props = PropsWithChildren<{
  size?: keyof typeof SIZE_CLASSES;
}>;

export function SubmitButton({ children, size = "md" }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`cursor-pointer flex w-full items-center justify-center gap-2 bg-emerald-500 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 ${SIZE_CLASSES[size]}`}
    >
      {pending && <SpinnerIcon />}
      {children}
    </button>
  );
}
