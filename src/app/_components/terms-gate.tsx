"use client";

import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { usePathname } from "next/navigation";

import { Footer } from "~/app/_components/footer";
import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";
import { useToast } from "~/app/_components/toast";
import { useModalDismiss } from "~/app/hooks/use-modal-dismiss";
import { termsClosing, termsIntro, termsRules, termsTitle } from "~/lib/terms-content";
import { api } from "~/trpc/react";

const MIN_READ_SECONDS = 60;

export function TermsGate({
  required,
  updated,
}: {
  required: boolean;
  updated: boolean;
}) {
  const pathname = usePathname();
  const excludedRoute =
    pathname.startsWith("/auth") || pathname.startsWith("/admin");

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(required && !excludedRoute);
  const [accepted, setAccepted] = useState(!required);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <Footer onOpenTerms={() => setOpen(true)} />
      {mounted && open && (
        <TermsModal
          dismissible={accepted}
          updated={updated}
          onAccepted={() => setAccepted(true)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function TermsModal({
  dismissible,
  updated,
  onAccepted,
  onClose,
}: {
  dismissible: boolean;
  updated: boolean;
  onAccepted: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  useModalDismiss(dismissible ? onClose : () => undefined);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [readTooFastWarning, setReadTooFastWarning] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (dismissible) return;

    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [dismissible]);

  const acceptMut = api.user.acceptTerms.useMutation({
    onSuccess: () => {
      onAccepted();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAccept = () => {
    if (!dismissible && elapsedSeconds < MIN_READ_SECONDS) {
      const remainingSeconds = MIN_READ_SECONDS - elapsedSeconds;
      setReadTooFastWarning(
        `You can't read all of these in ${elapsedSeconds} seconds, please wait ${remainingSeconds} more second${remainingSeconds === 1 ? "" : "s"} and read the terms carefully`,
      );
      return;
    }
    setReadTooFastWarning(null);
    acceptMut.mutate();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
      />

      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-foreground/10 bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{termsTitle}</h2>

        {!dismissible && updated && (
          <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            We&apos;ve updated our Terms &amp; Conditions since you last
            accepted — please review and accept again.
          </p>
        )}

        <div className="mb-6 max-h-[65vh] space-y-4 overflow-y-auto text-sm text-foreground/70">
          <p>{termsIntro}</p>

          <ol className="list-decimal space-y-3 pl-5">
            {termsRules.map((rule, i) => (
              <li key={i}>
                <span className="font-semibold text-foreground">
                  {rule.heading}
                </span>
                <p className="mt-1">{rule.body}</p>
                {rule.bullets && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {rule.bullets.map((bullet, j) => (
                      <li key={j}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          <p className="border-t border-foreground/10 pt-3 font-semibold text-foreground">
            {termsClosing}
          </p>
        </div>

        {readTooFastWarning && (
          <p className="mb-4 text-sm font-medium text-red-500">
            {readTooFastWarning}
          </p>
        )}

        <div className="flex justify-end">
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10"
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              disabled={acceptMut.isPending}
              onClick={handleAccept}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {acceptMut.isPending && <SpinnerIcon className="h-3.5 w-3.5" />}
              Accept
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
