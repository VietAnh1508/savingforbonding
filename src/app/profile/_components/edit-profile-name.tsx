"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { nameChangeAvailableAt } from "~/lib/user";
import { api } from "~/trpc/react";

export function EditProfileName({
  initialName,
  email,
  nameUpdatedAt,
}: {
  initialName: string | null | undefined;
  email: string | null | undefined;
  nameUpdatedAt: Date | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [lockedUntil, setLockedUntil] = useState(() =>
    nameChangeAvailableAt(nameUpdatedAt),
  );

  const updateName = api.user.updateName.useMutation({
    onSuccess: (user) => {
      setName(user.name ?? "");
      setEditing(false);
      setLockedUntil(nameChangeAvailableAt(user.nameUpdatedAt));
      router.refresh();
    },
  });

  function handleCancel() {
    setName(initialName ?? "");
    setEditing(false);
    updateName.reset();
  }

  return (
    <div>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateName.mutate({ name });
          }}
        >
          <div className="flex items-center gap-2">
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
              className="rounded-xl border border-foreground/10 bg-foreground/10 px-4 py-2 text-foreground placeholder:text-foreground/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="Your name"
            />
            <button
              type="submit"
              disabled={updateName.isPending || !name.trim()}
              aria-label="Save name"
              className="rounded-md p-1 text-emerald-400 transition hover:bg-foreground/10 disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={updateName.isPending}
              aria-label="Cancel"
              className="rounded-md p-1 text-foreground/40 transition hover:bg-foreground/10 hover:text-foreground disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-foreground/50">{email}</p>
          {updateName.error && (
            <p className="mt-1 text-sm text-red-400">{updateName.error.message}</p>
          )}
        </form>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold sm:text-2xl">
              {initialName?.trim() || "Your Profile"}
            </h1>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={!!lockedUntil}
              aria-label="Edit name"
              title={
                lockedUntil
                  ? `You can change your name again on ${lockedUntil.toLocaleString()}`
                  : "Edit name"
              }
              className="rounded-md p-1 text-foreground/40 transition hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </button>
          </div>
          <p className="text-sm text-foreground/60 sm:text-base">{email}</p>
          {lockedUntil && (
            <p className="mt-1 text-xs text-foreground/40">
              You can change your name again on {lockedUntil.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
