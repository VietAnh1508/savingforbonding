"use client";

import { SpinnerIcon } from "./icons/spinner-icon";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  dangerous = false,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-base font-semibold">{title}</h3>
        <p className="mb-6 text-sm text-foreground/60">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              dangerous
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-foreground text-card hover:bg-foreground/90"
            }`}
          >
            {loading && <SpinnerIcon className="h-3.5 w-3.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
