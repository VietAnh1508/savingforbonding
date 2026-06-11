"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

export function EditProfileName({
  initialName,
  email,
}: {
  initialName: string | null | undefined;
  email: string | null | undefined;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? "");

  const updateName = api.user.updateName.useMutation({
    onSuccess: (user) => {
      setName(user.name ?? "");
      setEditing(false);
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
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            updateName.mutate({ name });
          }}
        >
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1 block text-sm text-white/70"
            >
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
              className="w-full max-w-sm rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white placeholder:text-white/40 focus:border-emerald-500/50 focus:outline-none"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/70">Email</label>
            <p className="text-white/50">{email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={updateName.isPending || !name.trim()}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {updateName.isPending ? "Saving..." : "Save name"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={updateName.isPending}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>

          {updateName.error && (
            <p className="text-sm text-red-400">{updateName.error.message}</p>
          )}
        </form>
      ) : (
        <div>
          <h1 className="text-2xl font-bold">
            {initialName?.trim() || "Your Profile"}
          </h1>
          <p className="text-white/60">{email}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-emerald-500/30 hover:bg-white/10 hover:text-white"
          >
            Edit User Name
          </button>
        </div>
      )}
    </div>
  );
}
