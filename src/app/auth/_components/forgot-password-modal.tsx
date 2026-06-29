"use client";

import { useState } from "react";

export function ForgotPasswordModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer text-sm text-foreground/50 hover:text-foreground/70 transition"
      >
        Forgot password?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold">
              🐠 Forgot your password?
            </h3>
            <p className="mb-2 text-sm text-foreground/70">
              Forgot your password already? Classic goldfish memory.
            </p>
            <p className="mb-2 text-sm text-foreground/70">
              Unfortunately, we can&apos;t afford an email server to send you a
              reset link. If you&apos;d like to change that, feel free to donate
              to the dev team&apos;s coffee fund.
            </p>
            <p className="mb-6 text-sm text-foreground/70">
              In the meantime, contact the admin — he&apos;ll reset your account
              to a default password.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium bg-foreground text-card hover:bg-foreground/90 transition"
              >
                Got it, I&apos;ll figure it out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

