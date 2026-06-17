"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ConfirmDialog } from "~/app/_components/confirm-dialog";
import { UserCard } from "./user-card";

type PendingDelete = { id: string; name: string | null; email: string };

export function UsersPanel({ currentUserId }: { currentUserId?: string }) {
  const utils = api.useUtils();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const { data: users = [], isLoading } = api.admin.listUsers.useQuery();

  const deleteUser = api.admin.deleteUser.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      setPendingDelete(null);
    },
  });

  if (isLoading) {
    return <p className="text-white/50">Loading users...</p>;
  }

  return (
    <>
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
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                isDeleting={deleteUser.isPending && pendingDelete?.id === user.id}
                isSelf={user.id === currentUserId}
                onDelete={() =>
                  setPendingDelete({ id: user.id, name: user.name, email: user.email })
                }
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete user"
        description={`Remove ${pendingDelete?.name ?? pendingDelete?.email ?? "this user"} permanently? Their votes and data will be deleted.`}
        confirmLabel="Delete"
        dangerous
        loading={deleteUser.isPending}
        onConfirm={() => {
          if (pendingDelete) deleteUser.mutate({ id: pendingDelete.id });
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
