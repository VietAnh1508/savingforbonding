"use client";

import { api } from "~/trpc/react";
import { BeerIcon } from "~/app/_components/icons/beer-icon";
import { KeyIcon } from "~/app/_components/icons/key-icon";
import { TrashIcon } from "~/app/_components/icons/trash-icon";
import { VoteIcon } from "~/app/_components/icons/vote-icon";
import { Tooltip } from "~/app/_components/tooltip";

export function UsersPanel() {
  const { data: users = [], isLoading } = api.admin.listUsers.useQuery();

  if (isLoading) {
    return <p className="text-white/50">Loading users...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Users</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
          {users.length}
        </span>
      </div>

      {users.length === 0 ? (
        <p className="text-white/40">No users found.</p>
      ) : (
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
          {users.map((user) => {
            return (
              <div
                key={user.id}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {user.name ?? <span className="text-white/40">—</span>}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <VoteIcon />
                      {user._count.votes}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <BeerIcon />
                      {user.totalPoints}
                    </span>
                  </div>
                  <p className="truncate text-sm text-white/50">{user.email}</p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Tooltip label="Reset password - Coming soon">
                    <button
                      type="button"
                      className="cursor-pointer rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
                    >
                      <KeyIcon />
                    </button>
                  </Tooltip>
                  <Tooltip label="Delete user - Coming soon">
                    <button
                      type="button"
                      className="cursor-pointer rounded-md p-1.5 text-red-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <TrashIcon />
                    </button>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
