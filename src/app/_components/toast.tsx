"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import ReactDOM from "react-dom";

type ToastType = "success" | "error";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastAPI {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastAPI | null>(null);

let counter = 0;

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const add = useCallback(
    (message: string, type: ToastType) => {
      const id = String(++counter);
      setToasts((prev) => [...prev, { id, message, type, visible: false }]);
      // Flip visible on next tick so the enter transition fires
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, visible: true } : t)),
        );
      }, 10);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  const api: ToastAPI = {
    success: (msg) => add(msg, "success"),
    error: (msg) => add(msg, "error"),
  };

  return (
    <ToastContext value={api}>
      {children}
      <ToastPortal toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  );
}

function ToastPortal({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return ReactDOM.createPortal(
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const isSuccess = toast.type === "success";
  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{ transition: "opacity 0.25s, transform 0.25s" }}
      className={[
        "pointer-events-auto flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-toast py-2.5 pr-4 text-sm shadow-lg",
        toast.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      ].join(" ")}
    >
      <span
        className={`h-full w-1 self-stretch rounded-l-lg ${isSuccess ? "bg-green-500" : "bg-red-500"}`}
      />
      <span className={isSuccess ? "text-green-400" : "text-red-400"}>
        {isSuccess ? "✓" : "✕"}
      </span>
      <span className="text-toast-foreground/90">{toast.message}</span>
    </div>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
