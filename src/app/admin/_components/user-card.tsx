"use client";

import { BeerIcon } from "~/app/_components/icons/beer-icon";
import { KeyIcon } from "~/app/_components/icons/key-icon";
import { TrashIcon } from "~/app/_components/icons/trash-icon";
import { VoteIcon } from "~/app/_components/icons/vote-icon";
import { Tooltip } from "~/app/_components/tooltip";

interface UserCardProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    totalPoints: number;
    _count: { votes: number };
  };
  onDelete: () => void;
  onReset: () => void;
  isDeleting: boolean;
  isResetting: boolean;
  isSelf: boolean;
}

export function UserCard({ user, onDelete, onReset, isDeleting, isResetting, isSelf }: UserCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="font-semibold">
            {user.name ?? <span className="text-foreground/40">—</span>}
          </span>
          <span className="flex items-center gap-1 text-xs text-foreground/40">
            <VoteIcon />
            {user._count.votes}
          </span>
          <span className="flex items-center gap-1 text-xs text-foreground/40">
            <BeerIcon />
            {user.totalPoints}
          </span>
        </div>
        <p className="truncate text-sm text-foreground/50">{user.email}</p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Tooltip label="Reset password">
          <button
            type="button"
            disabled={isResetting}
            onClick={onReset}
            className="cursor-pointer rounded-md p-1.5 text-foreground/40 transition hover:bg-foreground/10 hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <KeyIcon />
          </button>
        </Tooltip>
        {!isSelf && (
          <Tooltip label="Delete user">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onDelete}
              className="cursor-pointer rounded-md p-1.5 text-red-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrashIcon />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
