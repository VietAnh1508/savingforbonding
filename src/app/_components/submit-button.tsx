"use client";

import { type PropsWithChildren } from "react";
import { useFormStatus } from "react-dom";

import { SpinnerIcon } from "./icons/spinner-icon";
import { Button } from "~/components/ui/button";

const SIZE_CLASSES = {
  md: "h-auto rounded-xl px-4 py-3",
  sm: "h-auto rounded-lg px-3 py-1.5 text-sm",
} as const;

type Props = PropsWithChildren<{
  size?: keyof typeof SIZE_CLASSES;
}>;

export function SubmitButton({ children, size = "md" }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className={`w-full shrink cursor-pointer gap-2 font-semibold disabled:cursor-not-allowed ${SIZE_CLASSES[size]}`}
    >
      {pending && <SpinnerIcon />}
      {children}
    </Button>
  );
}
